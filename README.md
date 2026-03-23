# AEM MCP Server

A comprehensive Model Context Protocol (MCP) server for Adobe Experience Manager (AEM) that provides intelligent asset lifecycle management and log analysis capabilities:

1. **Asset Expiration Management** - Find expired assets, check their usage, and auto-extend expiration dates
2. **Proactive Monitoring** - Identify assets expiring soon and recently expired assets
3. **Log Analysis** - Query and analyze AEM logs with natural language, intelligent caching, and context filtering

## Features

### Asset Lifecycle Management
- **List Expired Assets** - Query AEM DAM for assets past their expiration date
- **List Expiring Soon** - Find assets approaching expiration (configurable timeframe)
- **List Recently Expired** - Identify assets that recently expired
- **Check Page References** - Determine which published pages reference specific assets
- **Extend Expiration** - Automatically extend asset expiration dates

### Log Analysis & Diagnostics
- **Analyze AEM Logs** - Query logs with natural language (e.g., "errors in the last 24 hours")
- **Smart Caching** - 10-minute cache to avoid re-downloading logs for follow-up queries
- **Context Filtering** - Filter by log level, timeframe, keywords, and custom contexts
- **Intent Detection** - Automatically detect when to skip cache based on query keywords

## Setup

### Prerequisites
- Node.js 18+
- AEM instance with API access
- Valid AEM credentials (username/password or service account token)

### Installation

```bash
npm install
npm run build
```

### Configuration

Create a `.env` file in the project root:

```env
AEM_AUTHOR_URL=https://author.your-aem-instance.com
AEM_PUBLISH_URL=https://publish.your-aem-instance.com
AEM_USERNAME=your-service-account
AEM_PASSWORD=your-api-token-or-password
```

Configure Claude Desktop by updating `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aem-mcp-server": {
      "command": "node",
      "args": ["/path/to/aem-mcp-server/dist/index.js"],
      "env": {
        "AEM_AUTHOR_URL": "https://author.your-aem-instance.com",
        "AEM_PUBLISH_URL": "https://publish.your-aem-instance.com",
        "AEM_USERNAME": "your-account",
        "AEM_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

The server exposes the following tools through the MCP protocol:

### Asset Management
- `list_expired_assets` - Get all expired assets in AEM DAM with metadata
- `list_expiring_soon` - Find assets approaching expiration (configurable timeframe)
- `list_recently_expired` - Query recently expired assets
- `check_asset_references` - Find published pages that reference a specific asset
- `extend_asset_expiration` - Extend asset expiration dates

### Log Analysis
- `analyze_aem_logs` - Query AEM logs with natural language filtering and caching

## Development

```bash
npm run dev          # Watch mode
npm run test         # Run tests
npm run lint         # Lint code
```

## Architecture

```
src/
├── index.ts                    # MCP server entry point
├── aem-client.ts               # AEM REST API wrapper with parallel fetch optimization
├── asset-config.ts             # Configuration and environment management
├── constants.ts                # Centralized configuration constants
├── tools/
│   ├── list-expired-assets.ts  # Query expired assets tool
│   ├── list-expiring-soon.ts   # Query assets expiring soon tool
│   ├── list-recently-expired.ts# Query recently expired assets tool
│   ├── check-references.ts     # Check asset page references tool
│   ├── extend-expiration.ts    # Extend asset expiration tool
│   └── analyze-logs.ts         # Analyze AEM logs with NLP and caching
└── utils/
    ├── date-utils.ts           # Date parsing and calculation helpers
    ├── timeframe-parser.ts      # Natural language timeframe parsing
    └── logger.ts               # Environment-aware logging utility
```
