# AEM DAM Asset Expiration Manager

An MCP (Model Context Protocol) server that helps manage AEM Digital Asset Management (DAM) assets by:

1. **Finding expired assets** - Queries AEM DAM for assets past their expiration date
2. **Checking references** - Identifies which expired assets are referenced in published pages
3. **Auto-extending expiration** - Extends the expiration date by one year for referenced assets

## Features

- **List Expired Assets** - Get all assets in AEM DAM that have exceeded their expiration date
- **Check Page References** - Determine which published pages reference a specific asset
- **Extend Expiration** - Automatically extend asset metadata to push expiration forward
- **Bulk Operations** - Process multiple assets efficiently through MCP tools

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

Create a `.env` file or set environment variables:

```
AEM_HOST=https://your-aem-instance.com
AEM_USERNAME=your-username
AEM_PASSWORD=your-password
AEM_AUTHOR_URL=https://author.your-aem-instance.com
AEM_PUBLISH_URL=https://publish.your-aem-instance.com
```

See `claude_desktop_config_example.json` for MCP server configuration.

## Usage

The server exposes tools accessible through the MCP protocol:

- `list_expired_assets` - Query DAM for expired assets with filters
- `check_asset_references` - Find pages using a specific asset
- `extend_asset_expiration` - Set new expiration date (default: +1 year)
- `bulk_extend_expired_assets` - Process all expired referenced assets in one operation

## Development

```bash
npm run dev          # Watch mode
npm run test         # Run tests
npm run lint         # Lint code
```

## Architecture

```
src/
├── index.ts               # MCP server entry point
├── aem-client.ts          # AEM API wrapper
├── asset-config.ts        # Configuration management
├── tools/
│   ├── list-expired-assets.ts
│   ├── check-references.ts
│   └── extend-expiration.ts
└── utils/
    └── date-utils.ts      # Date manipulation helpers
```
