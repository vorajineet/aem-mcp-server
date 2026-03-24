/**
 * Application constants for AEM MCP Server
 */

// AEM API paths and properties
export const AEM = {
  AUTHOR_URL: process.env.AEM_AUTHOR_URL || '',
  PUBLISH_URL: process.env.AEM_PUBLISH_URL || '',
  
  PATHS: {
    DAM: '/content/dam',
    CONTENT: '/content',
    METADATA: '/jcr:content/metadata.json',
    JCR_CONTENT: '/jcr:content.json',
    QUERYBUILDER: '/bin/querybuilder.json',
  },

  PROPERTIES: {
    EXPIRATION_DATE: 'prism:expirationDate',
    TITLE: 'jcr:title',
    LAST_MODIFIED: 'jcr:lastModified',
    LAST_REPLICATED: 'cq:lastReplicated',
    LAST_REPLICATED_BY: 'cq:lastReplicatedby',
  },

  TYPES: {
    ASSET: 'dam:Asset',
    PAGE: 'cq:Page',
  },

  QUERYBUILDER_DEFAULTS: {
    LIMIT: '1000',
    OFFSET: '0',
  },
} as const;

// Time constants
export const TIME = {
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
  MS_PER_MONTH: 30 * 24 * 60 * 60 * 1000,
  MS_PER_YEAR: 365 * 24 * 60 * 60 * 1000,

  HOURS_PER_DAY: 24,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 365,
} as const;

// Cache configuration
export const CACHE = {
  VALIDITY_MS: 10 * 60 * 1000, // 10 minutes
} as const;

// Default configuration
export const DEFAULTS = {
  LOG_LEVEL: 'ERROR' as const,
  LOG_LIMIT: 50,
  LOG_TIME_RANGE: '24h',
  YEARS_TO_EXTEND: 1,
} as const;

// Error messages
export const ERRORS = {
  MISSING_ENV: 'Missing required environment variables: AEM_AUTHOR_URL, AEM_PUBLISH_URL, AEM_USERNAME, AEM_PASSWORD',
  INVALID_TIMEFRAME: 'Invalid timeframe format. Use formats like: "1 hour", "30 days", "2 months", "1 year"',
  INVALID_TIME_RANGE: 'Invalid time range format. Use: 1h, 24h, 7d, 2w',
  AEM_REQUEST_FAILED: 'AEM request failed',
  LOG_NOT_FOUND: 'error.log not found in downloaded zip',
} as const;
