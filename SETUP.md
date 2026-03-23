# AEM MCP Server - Setup Guide

## Quick Start

### 1. Build the Project

```bash
cd /Users/jineetvora/Work/fun/aem-mcp-server
npm install
npm run build
```

### 2. Configure Environment

Create a `.env` file in the project root (copy from `.env.example`):

```env
AEM_AUTHOR_URL=https://author-instance.example.com
AEM_PUBLISH_URL=https://publish-instance.example.com
AEM_USERNAME=your-service-account
AEM_PASSWORD=your-api-token-or-password
```

### 3. Configure Claude Desktop

Update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aem-mcp-server": {
      "command": "node",
      "args": ["/Users/jineetvora/Work/fun/aem-mcp-server/dist/index.js"],
      "env": {
        "AEM_AUTHOR_URL": "https://author.example.com",
        "AEM_PUBLISH_URL": "https://publish.example.com",
        "AEM_USERNAME": "your-account",
        "AEM_PASSWORD": "your-password"
      }
    }
  }
}
```

### 4. Use in Claude

Example conversations:

**Asset Management:**
> "Show me all expired assets in the DAM"
> "What assets will expire in the next 30 days?"
> "Which pages reference /content/dam/mysite/hero-image.jpg?"
> "Extend the expiration of /content/dam/mysite/important-document.pdf by one year"

**Log Analysis:**
> "Show me errors from the last 24 hours"
> "Find all 404 errors in the DAM logs"
> "What errors occurred in the last 2 hours?"

**Complete Workflow:**
> "Find all expired assets, tell me which ones are referenced in published pages, and extend the expiration by one year for any that are referenced"

## Project Structure

```
aem-mcp-server/
├── src/
│   ├── index.ts                          # MCP server entry point
│   ├── aem-client.ts                     # AEM REST API wrapper
│   ├── asset-config.ts                   # Configuration management
│   ├── constants.ts                      # Centralized configuration constants
│   ├── tools/
│   │   ├── list-expired-assets.ts        # Tool: List expired assets
│   │   ├── list-expiring-soon.ts         # Tool: List assets expiring soon
│   │   ├── list-recently-expired.ts      # Tool: List recently expired assets
│   │   ├── check-references.ts           # Tool: Find page references
│   │   ├── extend-expiration.ts          # Tool: Update expiration dates (⚠️ write op)
│   │   └── analyze-logs.ts               # Tool: Analyze AEM logs with NLP
│   └── utils/
│       ├── date-utils.ts                 # Date manipulation helpers
│       ├── timeframe-parser.ts           # Natural language timeframe parsing
│       └── logger.ts                     # Environment-aware logging
├── dist/                                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── README.md
├── SETUP.md                              # This file
├── .env.example
└── claude_desktop_config_example.json
```

## How It Works

### 1. List Expired Assets
Queries AEM DAM using QueryBuilder for assets where `prism:expirationDate` is in the past (under `jcr:content/metadata`).

### 2. Check References
Searches the AEM publish instance for pages that reference a specific asset path.

### 3. Extend Expiration
Updates the asset's `jcr:content/metadata/prism:expirationDate` metadata property to a new date (default: 1 year from today).

## Available Tools

- **list_expired_assets** - Find all expired assets in DAM (with optional filter)
- **check_asset_references** - Find published pages that use an asset
- **extend_asset_expiration** - Update asset expiration date

## AEM Requirements

Your AEM instance needs:
- QueryBuilder API enabled (available by default)
- REST API asset update access
- Service account/user with:
  - Read access to `/content/dam`
  - Read access to `/content` (pages)
  - Write access to asset metadata on author
  - Access to both author and publish instances

## Troubleshooting

**"Cannot connect to AEM"**
- Check AEM_AUTHOR_URL and AEM_PUBLISH_URL are correct
- Verify credentials (username/password)
- Check network connectivity

**"Asset has no expiration date"**
- Not all assets have the `jcr:content/metadata/prism:expirationDate` property
- The tool only finds assets with explicit expiration dates set

**"No pages found as references"**
- Assets might be referenced programmatically (not in page content)
- Check your publish instance has the content
- May need broader reference checking logic

## Development

```bash
npm run build     # Compile TypeScript
npm run dev       # Watch mode (auto-recompile on changes)
npm run test      # Run tests
npm run lint      # Lint code
```

## License

MIT
