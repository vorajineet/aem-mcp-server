/**
 * AEM Log Analysis Tool
 * Analyzes AEM logs with natural language queries to find errors, warnings, and specific issues
 */

import { AEMClient } from '../aem/aem-client.js';
import AdmZip from 'adm-zip';
import { parseCompactTimeRange } from '../utils/timeframe-parser.js';

const CACHE_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache to avoid re-downloading logs for follow-up queries
let logCache: { content: string; timestamp: number } | null = null;

function isCacheValid(): boolean {
  if (!logCache) return false;
  const cacheAge = Date.now() - logCache.timestamp;
  const isValid = cacheAge < CACHE_VALIDITY_MS;
  console.error('[CACHE] Cache age:', Math.round(cacheAge / 1000), 's, valid:', isValid);
  return isValid;
}

export interface AnalyzeLogsInput {
  query: string;
  timeRange?: string;
  logLevel?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  limit?: number;
  skipCache?: boolean;
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  thread: string;
  logger: string;
  message: string;
  rawLine: string;
}

export interface AnalysisResult {
  query: string;
  timeRange: string;
  matchedEntries: LogEntry[];
  summary: string;
  count: number;
}

/**
 * Parse natural language query to extract context
 */
function parseQueryContext(query: string): {
  keywords: string[];
  logLevels: string[];
  context: string; // 'page', 'dam', 'workflow', 'publish', 'general'
} {
  console.error('[PARSE_QUERY] Input query:', query);
  
  const lowerQuery = query.toLowerCase();

  let context = 'general';
  if (lowerQuery.includes('page')) context = 'page';
  else if (lowerQuery.includes('dam') || lowerQuery.includes('asset')) context = 'dam';
  else if (lowerQuery.includes('workflow')) context = 'workflow';
  else if (lowerQuery.includes('publish') || lowerQuery.includes('replication'))
    context = 'publish';

  console.error('[PARSE_QUERY] Detected context:', context);

  const logLevels = [];
  if (lowerQuery.includes('error') || lowerQuery.includes('fail'))
    logLevels.push('ERROR');
  if (lowerQuery.includes('404')) logLevels.push('ERROR'); // 404s are errors
  if (lowerQuery.includes('warn')) logLevels.push('WARN');

  // Extract page names or identifiers (e.g., 'page abc', 'for abc', '/content/dam/...')
  const keywords = [];
  const pageMatch = query.match(
    /(?:page|for)\s+['"]?([a-zA-Z0-9\-_/]+)['"]?/i
  );
  if (pageMatch) {
    console.error('[PARSE_QUERY] Found page/path match:', pageMatch[1]);
    keywords.push(pageMatch[1]);
  }

  // Also check for paths like /content/dam/...
  const pathMatch = query.match(/\/[a-zA-Z0-9\-_/]+/g);
  if (pathMatch) {
    console.error('[PARSE_QUERY] Found path matches:', pathMatch);
    keywords.push(...pathMatch);
  }

  console.error('[PARSE_QUERY] Extracted keywords:', keywords);
  console.error('[PARSE_QUERY] Log levels to filter:', logLevels.length > 0 ? logLevels : ['ERROR']);

  return {
    keywords,
    logLevels: logLevels.length > 0 ? logLevels : ['ERROR'],
    context
  };
}

/**
 * Convert time range string to milliseconds
 */
function parseTimeRange(timeRange: string = '24h'): number {
  console.error('[PARSE_TIME_RANGE] Input:', timeRange);
  
  const result = parseCompactTimeRange(timeRange);
  console.error('[PARSE_TIME_RANGE] Result in milliseconds:', result);
  
  return result;
}

/**
 * Parse a log line from error.log
 * AEM format: MM.dd.yyyy HH:mm:ss.SSS *LEVEL* [thread] logger message
 */
function parseLogLine(line: string): LogEntry | null {
  if (!line.trim()) {
    return null; // Skip empty lines
  }

  const logRegex =
    /^(\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}:\d{2}\.\d{3})\s+\*(\w+)\*\s+\[([^\]]+)\]\s+([^\s]+)\s+(.*)/;

  const match = line.match(logRegex);
  if (!match) {
    // Uncomment for detailed debugging of unparseable lines
    // console.error('[PARSE_LOG_LINE] Could not parse line:', line.substring(0, 100));
    return null;
  }

  const [, timeStr, level, thread, logger, message] = match;

  const parsed = {
    timestamp: parseAEMTimestamp(timeStr),
    level,
    thread,
    logger,
    message,
    rawLine: line
  };

  return parsed;
}

function parseAEMTimestamp(timeStr: string): Date {
  // Convert "03.23.2026 14:30:45.123" to Date
  return new Date(timeStr.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1'));
}

/**
 * Filter log entries based on query context
 */
function filterLogsByQuery(
  logs: LogEntry[],
  query: string,
  timeRange: string,
  logLevel: string = 'ERROR',
  limit: number = 50
): LogEntry[] {
  console.error('[FILTER_LOGS] Starting filter with', logs.length, 'total logs');
  
  const { keywords, context } = parseQueryContext(query);
  console.error('[FILTER_LOGS] Parsed keywords:', keywords);
  console.error('[FILTER_LOGS] Parsed context:', context);
  
  const timeMs = parseTimeRange(timeRange);
  console.error('[FILTER_LOGS] Time range in ms:', timeMs);
  
  const cutoffTime = new Date(Date.now() - timeMs);
  console.error('[FILTER_LOGS] Cutoff time:', cutoffTime.toISOString());

  const filtered = logs
    .filter(log => {
      // Time filter
      if (log.timestamp < cutoffTime) return false;

      // Log level filter
      if (!log.level.includes(logLevel)) return false;

      // Context-based filtering
      const lowerMsg = log.message.toLowerCase();

      if (context === 'page' && keywords.length > 0) {
        return keywords.some(kw => lowerMsg.includes(kw.toLowerCase()));
      }

      if (context === 'dam') {
        return (
          lowerMsg.includes('dam') ||
          lowerMsg.includes('asset') ||
          lowerMsg.includes('/content/dam')
        );
      }

      if (context === 'workflow') {
        return (
          lowerMsg.includes('workflow') || lowerMsg.includes('replicate')
        );
      }

      if (context === 'publish') {
        return (
          lowerMsg.includes('publish') ||
          lowerMsg.includes('replication') ||
          lowerMsg.includes('replicate')
        );
      }

      // 404 specific
      if (query.toLowerCase().includes('404')) {
        return lowerMsg.includes('404') || lowerMsg.includes('not found');
      }

      // General match - check if query keywords appear
      return (
        keywords.length === 0 ||
        keywords.some(kw => lowerMsg.includes(kw.toLowerCase()))
      );
    })
    .slice(-limit) // Get last N entries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Most recent first
  
  console.error('[FILTER_LOGS] After filtering:', filtered.length, 'logs');
  console.error('[FILTER_LOGS] Time range applied:', logLevel, 'level, cutoff:', cutoffTime.toISOString());
  
  return filtered;
}

/**
 * Generate summary of findings
 */
function generateSummary(entries: LogEntry[], query: string): string {
  if (entries.length === 0) {
    return `No matching logs found for query: "${query}"`;
  }

  const levelCounts = entries.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summary = `Found ${entries.length} matching log entries:\n`;
  const breakdown = Object.entries(levelCounts)
    .map(([level, count]) => `  - ${level}: ${count}`)
    .join('\n');

  return summary + breakdown;
}

/**
 * Check if query contains keywords that suggest fresh logs are needed
 */
function shouldSkipCacheByKeyword(query: string): boolean {
  const skipKeywords = ['latest', 'now', 'refresh', 'fresh', 'current', 'real-time', 'right now', 'just happened', 'just occurred', 'recent'];
  const queryLower = query.toLowerCase();
  const shouldSkip = skipKeywords.some(kw => queryLower.includes(kw));
  
  if (shouldSkip) {
    console.error('[ANALYZE_LOGS] Query contains cache-skip keyword, forcing fresh download');
  }
  
  return shouldSkip;
}

/**
 * Main tool function to analyze AEM logs
 */
export async function analyzeAEMLogs(
  input: AnalyzeLogsInput,
  aemClient: AEMClient
): Promise<AnalysisResult> {
  const {
    query,
    timeRange = '24h',
    logLevel = 'ERROR',
    limit = 50,
    skipCache = false
  } = input;

  try {
    console.error('[ANALYZE_LOGS] Starting log analysis');
    console.error('[ANALYZE_LOGS] Input query:', query);
    console.error('[ANALYZE_LOGS] Time range:', timeRange);
    console.error('[ANALYZE_LOGS] Log level filter:', logLevel);
    console.error('[ANALYZE_LOGS] Limit:', limit);

    // 1. Download logs zip or use cache
    let logContent: string;
    
    const forceSkipCache = skipCache || shouldSkipCacheByKeyword(query);
    console.error('[ANALYZE_LOGS] skipCache parameter:', skipCache);
    console.error('[ANALYZE_LOGS] Force skip cache:', forceSkipCache);
    
    if (!forceSkipCache && isCacheValid()) {
      console.error('[ANALYZE_LOGS] Using cached logs');
      logContent = logCache!.content;
    } else {
      if (forceSkipCache) {
        console.error('[ANALYZE_LOGS] Cache disabled - downloading fresh logs from AEM...');
      } else {
        console.error('[ANALYZE_LOGS] Downloading fresh logs from AEM...');
      }
      const zipBuffer = await aemClient.downloadLogsZip();
      console.error('[ANALYZE_LOGS] Downloaded zip size:', zipBuffer.length, 'bytes');

      // 2. Unzip and extract error.log
      console.error('[ANALYZE_LOGS] Extracting error.log from zip...');
      const zip = new AdmZip(zipBuffer);
      
      // Find error.log in the zip (might be nested in a directory)
      const allEntries = zip.getEntries();
      console.error('[ANALYZE_LOGS] Zip contains', allEntries.length, 'entries');
      
      let errorLogEntry = null;
      for (const entry of allEntries) {
        console.error('[ANALYZE_LOGS] Zip entry:', entry.entryName);
        if (entry.entryName.endsWith('error.log') && !entry.isDirectory) {
          errorLogEntry = entry;
          console.error('[ANALYZE_LOGS] Found error.log at:', entry.entryName);
          break;
        }
      }

      if (!errorLogEntry) {
        const availableFiles = allEntries
          .filter(e => !e.isDirectory)
          .map(e => e.entryName)
          .slice(0, 10)
          .join(', ');
        throw new Error(
          `error.log not found in downloaded zip. Available files: ${availableFiles}`
        );
      }

      logContent = zip.readAsText(errorLogEntry);
      console.error('[ANALYZE_LOGS] error.log size:', logContent.length, 'characters');
      
      // Save to in-memory cache for follow-up queries
      logCache = { content: logContent, timestamp: Date.now() };
    }

    const logLines = logContent.split('\n');
    console.error('[ANALYZE_LOGS] Total log lines:', logLines.length);

    // 3. Parse all log entries
    console.error('[ANALYZE_LOGS] Parsing log entries...');
    const allLogs = logLines
      .map(line => parseLogLine(line))
      .filter((log): log is LogEntry => log !== null);

    console.error('[ANALYZE_LOGS] Successfully parsed:', allLogs.length, 'log entries');
    
    if (allLogs.length > 0) {
      console.error('[ANALYZE_LOGS] First log:', {
        timestamp: allLogs[0].timestamp.toISOString(),
        level: allLogs[0].level,
        message: allLogs[0].message.substring(0, 100)
      });
      console.error('[ANALYZE_LOGS] Last log:', {
        timestamp: allLogs[allLogs.length - 1].timestamp.toISOString(),
        level: allLogs[allLogs.length - 1].level,
        message: allLogs[allLogs.length - 1].message.substring(0, 100)
      });
    }

    // 4. Parse query context
    console.error('[ANALYZE_LOGS] Parsing query context...');
    const queryContext = parseQueryContext(query);
    console.error('[ANALYZE_LOGS] Query context:', queryContext);

    // 5. Filter based on query
    console.error('[ANALYZE_LOGS] Filtering logs...');
    const matchedEntries = filterLogsByQuery(
      allLogs,
      query,
      timeRange,
      logLevel,
      limit
    );

    console.error('[ANALYZE_LOGS] Matched entries:', matchedEntries.length);
    if (matchedEntries.length > 0) {
      console.error('[ANALYZE_LOGS] Sample matches:', matchedEntries.slice(0, 3).map(e => ({
        timestamp: e.timestamp.toISOString(),
        level: e.level,
        message: e.message.substring(0, 80)
      })));
    }

    // 6. Generate summary
    console.error('[ANALYZE_LOGS] Generating summary...');
    const summary = generateSummary(matchedEntries, query);
    console.error('[ANALYZE_LOGS] Summary:', summary);

    console.error('[ANALYZE_LOGS] Analysis complete');

    return {
      query,
      timeRange,
      matchedEntries,
      summary,
      count: matchedEntries.length
    };
  } catch (error) {
    console.error('[ANALYZE_LOGS] Error occurred:', error);
    throw new Error(
      `Failed to analyze logs: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
