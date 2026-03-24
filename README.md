# AEM MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Adobe Experience Manager (AEM) that gives Claude Desktop direct access to your AEM instance — manage asset expirations, check page references, and analyze logs through natural conversation.

## What Can It Do?

| Capability | Description |
|---|---|
| **Asset Expiration Management** | Find expired assets, assets expiring soon, and recently expired assets |
| **Reference Tracking** | Check which published (or unpublished) pages use a specific asset |
| **Expiration Extension** | Extend asset expiration dates — set custom dates or add years |
| **Log Analysis** | Query AEM error logs with natural language and smart in-memory caching |

## Quick Start

```bash
npm install
npm run build
```

Then configure Claude Desktop — see [SETUP.md](SETUP.md) for the full guide.

## Available Tools

| Tool | Type | Description |
|---|---|---|
| `list_assets_by_expiration` | Read | Query assets by status: `expired`, `expiring-soon`, or `recently-expired` |
| `check_asset_references` | Read | Find pages referencing a specific asset (published or all) |
| `extend_asset_expiration` | ⚠️ Write | Extend or set asset expiration dates. Modifies AEM metadata. |
| `analyze_aem_logs` | Read | Query AEM logs with natural language, time ranges, and log level filters |

## Example Prompts

Once connected, just ask Claude naturally:

### Asset Expiration
```
Show me all expired assets
What assets are expiring in the next 30 days?
Show me assets that expired in the last 7 days
Find expired assets with "hero" in the path
```

### Reference Checking
```
Which pages use /content/dam/mysite/hero-banner.jpg?
Check references for /content/dam/mysite/logo.png including unpublished pages
```

### Expiration Management
```
Extend the expiration of /content/dam/mysite/important-doc.pdf by 2 years
Set the expiration of /content/dam/mysite/banner.jpg to 2027-12-31
```

### Log Analysis
```
Show me errors from the last 24 hours
Find 404 errors in the DAM logs
What publishing errors happened in the last 2 hours?
Show me workflow errors from the last 7 days
```

### Multi-Step Workflows
```
Find all expired assets, check which ones are still referenced by published pages,
and extend the expiration by 1 year for any that are actively used.
```

## Architecture

```
src/
├── index.ts                         # MCP server entry point & tool registration
├── aem/
│   ├── aem-client.ts                # AEM REST API wrapper (parallel fetch)
│   ├── asset-config.ts              # Environment variable loading
│   └── constants.ts                 # Centralized config constants
├── tools/
│   ├── list-assets-by-expiration.ts # Unified expiration status queries
│   ├── check-references.ts          # Asset reference lookup
│   ├── extend-expiration.ts         # Expiration date updates (⚠️ write op)
│   └── analyze-logs.ts              # Log analysis with in-memory caching
└── utils/
    ├── date-utils.ts                # Date parsing and calculations
    ├── timeframe-parser.ts          # Natural language timeframe parsing
    └── logger.ts                    # Environment-aware logging
```
