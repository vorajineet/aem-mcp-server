#!/usr/bin/env node

/**
 * AEM DAM Expiration Manager - MCP Server
 * Manages asset expiration, reference checking, and auto-renewal
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, AEMConfig } from './aem/asset-config.js';
import { AEMClient } from './aem/aem-client.js';
import {
  listAssetsByExpiration,
  ListAssetsByExpirationInput,
} from './tools/list-assets-by-expiration.js';
import {
  checkAssetReferences,
  CheckReferencesInput,
} from './tools/check-references.js';
import {
  extendAssetExpiration,
  ExtendExpirationInput,
} from './tools/extend-expiration.js';
import {
  analyzeAEMLogs,
  AnalyzeLogsInput,
} from './tools/analyze-logs.js';

const TOOLS: Tool[] = [
  {
    name: 'list_assets_by_expiration',
    description:
      'List AEM DAM assets by their expiration status. Use status "expired" for all expired assets, "expiring-soon" for assets approaching expiration, or "recently-expired" for assets that expired within a recent timeframe. Timeframe is required for "expiring-soon" and "recently-expired".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['expired', 'expiring-soon', 'recently-expired'],
          description:
            'Expiration status to query: "expired" (all past expiration), "expiring-soon" (approaching expiration), "recently-expired" (expired within a recent timeframe)',
        },
        timeframe: {
          type: 'string',
          description:
            'Required for "expiring-soon" and "recently-expired". Examples: "30 days", "2 months", "1 year", "1 hour"',
        },
        filter: {
          type: 'string',
          description: 'Optional filter string to match asset path or name',
        },
      },
      required: ['status'],
    },
  },
  {
    name: 'check_asset_references',
    description:
      'Check which pages reference a specific asset. By default only shows published pages. Set includeUnpublished to true to also see unpublished pages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetPath: {
          type: 'string',
          description: 'Full path to the asset (e.g., /content/dam/my-site/image.jpg)',
        },
        includeUnpublished: {
          type: 'boolean',
          description: 'Include unpublished pages in results. Default: false (only published pages)',
        },
      },
      required: ['assetPath'],
    },
  },
  {
    name: 'extend_asset_expiration',
    description:
      '⚠️  WRITE OPERATION - Extend the expiration date of an asset. Updates asset metadata in AEM. Default is 1 year from today. Use with caution as this modifies content.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetPath: {
          type: 'string',
          description: 'Full path to the asset',
        },
        yearsToAdd: {
          type: 'number',
          description: 'Number of years to add to expiration (default: 1)',
        },
        customDate: {
          type: 'string',
          description: 'Custom expiration date in YYYY-MM-DD format',
        },
      },
      required: ['assetPath'],
    },
  },
  {
    name: 'analyze_aem_logs',
    description:
      'Analyze AEM error logs with natural language queries. Find specific errors, 404s, warnings for pages, DAM, workflows, etc. within a time range.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Natural language query. Examples: "Errors for page abc in last hour", "404s in DAM last 2 days", "Publishing workflow errors last 24 hours"',
        },
        timeRange: {
          type: 'string',
          description:
            'Time range for logs. Examples: "1h", "24h", "7d". Default: "24h"',
        },
        logLevel: {
          type: 'string',
          enum: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
          description: 'Filter logs by level. Default: "ERROR"',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return. Default: 50',
        },
        skipCache: {
          type: 'boolean',
          description: 'Force download fresh logs, ignoring cache. Default: false. Also auto-triggered by keywords like "latest", "now", "refresh"',
        },
      },
      required: ['query'],
    },
  },
];

class AEMExpirationServer {
  private server: Server;
  private config: AEMConfig;
  private aemClient: AEMClient;

  constructor() {
    this.config = loadConfig();
    this.aemClient = new AEMClient(this.config);

    this.server = new Server(
      {
        name: 'aem-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const toolInput = request.params.arguments as Record<string, any>;

      let result: string;

      try {
        switch (toolName) {
          case 'list_assets_by_expiration':
            result = await listAssetsByExpiration(
              this.aemClient,
              toolInput as ListAssetsByExpirationInput
            );
            break;

          case 'check_asset_references':
            result = await checkAssetReferences(
              this.aemClient,
              toolInput as CheckReferencesInput
            );
            break;

          case 'extend_asset_expiration':
            result = await extendAssetExpiration(
              this.aemClient,
              toolInput as ExtendExpirationInput
            );
            break;

          case 'analyze_aem_logs':
            const analysisResult = await analyzeAEMLogs(
              toolInput as AnalyzeLogsInput,
              this.aemClient
            );
            result = JSON.stringify({
              summary: analysisResult.summary,
              count: analysisResult.count,
              query: analysisResult.query,
              timeRange: analysisResult.timeRange,
              entries: analysisResult.matchedEntries.map(entry => ({
                timestamp: entry.timestamp.toISOString(),
                level: entry.level,
                logger: entry.logger,
                message: entry.message,
              })),
            }, null, 2);
            break;

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: result,
            } as TextContent,
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorMessage}`,
            } as TextContent,
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AEM DAM Expiration Manager MCP server running');
  }
}

const server = new AEMExpirationServer();
server.run().catch(console.error);
