# AEM MCP Server - Setup Guide

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Claude Desktop** — [Download](https://claude.ai/download) or Cursor — [Download](https://cursor.com/download)
- **AEM instance** with API access (author + publish)
- **AEM credentials** — username/password or service account token

## 1. Build the Project

```bash
cd aem-mcp-server
npm install
npm run build
```

## 2. Configure AEM Credentials

You need four environment variables:

| Variable | Description | Example |
|---|---|---|
| `AEM_AUTHOR_URL` | Author instance URL | `https://author.example.com` |
| `AEM_PUBLISH_URL` | Publish instance URL | `https://publish.example.com` |
| `AEM_USERNAME` | Service account or user | `my-service-account` |
| `AEM_PASSWORD` | Password or API token | `my-api-token` |

Edit the `.env` file in the project root with your AEM instance details:

```env
AEM_AUTHOR_URL=http://localhost:4502
AEM_PUBLISH_URL=http://localhost:4503
AEM_USERNAME=admin
AEM_PASSWORD=admin
```

The file ships with localhost defaults so you can get started immediately with a local AEM instance.

> **Note:** For production environments, use OAuth/IMS tokens or a secrets manager instead of plaintext credentials.

## 3. Configure Claude Desktop or Cursor

### -> For Claude Desktop:

Claude Desktop uses a JSON config file to register MCP servers. Edit:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Minimal config (credentials via `.env` file):

```json
{
  "mcpServers": {
    "aem-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/aem-mcp-server/dist/index.js"]
    }
  }
}
```

### Full config (credentials inline):

```json
{
  "mcpServers": {
    "aem-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/aem-mcp-server/dist/index.js"],
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

> Replace `/absolute/path/to/aem-mcp-server` with the actual path where you cloned the project.

### After saving the config

1. **Quit Claude Desktop completely** (not just close the window)
2. **Reopen Claude Desktop**
3. Look for the **hammer icon** (🔨) in the chat input — this confirms the MCP server is connected
4. Click the hammer icon to see the list of available tools

### -> For Cursor

Cursor supports MCP servers through its settings. You can configure the AEM MCP server in two ways:

### Option A: Project-level config (recommended)

Create a `.cursor/mcp.json` file in your project root:

#### With credentials via `.env` file:

```json
{
  "mcpServers": {
    "aem-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/aem-mcp-server/dist/index.js"]
    }
  }
}
```

#### With credentials inline:

```json
{
  "mcpServers": {
    "aem-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/aem-mcp-server/dist/index.js"],
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

> Replace `/absolute/path/to/aem-mcp-server` with the actual path where you cloned the project.

### Option B: Global config

Create or edit `~/.cursor/mcp.json` with the same JSON structure above. This makes the server available across all your Cursor projects.

### After saving the config

1. Open **Cursor Settings** → **MCP** to verify the server appears in the list
2. Ensure the server status shows a **green indicator** (connected)
3. If the server doesn't connect, click the **refresh** button next to it
4. The AEM tools will now be available in Cursor's Agent mode (⌘I / Ctrl+I)

> **Note:** MCP tools in Cursor are available in **Agent mode** only, not in the normal chat or edit modes.

> **Production usage:** A remote MCP server is preferred for teams — run the server as an HTTP service that clients connect to over the network (behind a VPN or auth gateway).

## 4. Disabling Tools

You can disable specific tools without modifying code by using Claude Desktop's or Cursor's **tool approval** feature:

### Per-conversation control
When Claude/Cursor wants to use a tool, it shows a confirmation prompt. You can:
- **Allow once** — permit the tool call this one time
- **Allow for this chat** — permit all calls to this tool in the current conversation
- **Deny** — block the tool call

### Disabling the write tool
The `extend_asset_expiration` tool is the only write operation. If you want read-only access, you can simply deny it when prompted, or remove it from the server by commenting out its registration in `src/index.ts` and rebuilding:

```typescript
// In src/index.ts, comment out in the TOOLS array and switch statement:
// { name: 'extend_asset_expiration', ... },
// case 'extend_asset_expiration': ...
```

Then rebuild: `npm run build`

### Removing the entire MCP server
Delete or rename the `aem-mcp-server` entry in your `claude_desktop_config.json` or `mcp.json` and restart the application.

## 5. Verify It Works

After configuring, open Claude Desktop or Cursor and try:

```
Show me all expired assets
```

If the server is connected, Claude will call the `list_assets_by_expiration` tool and return results from your AEM instance.

## Example Prompts

### Asset Expiration

| Prompt | What it does |
|---|---|
| `Show me all expired assets` | Lists every asset past its expiration date |
| `What assets expire in the next 30 days?` | Shows assets expiring soon |
| `Show recently expired assets from the last 7 days` | Assets that just expired |
| `Find expired assets with "campaign" in the path` | Filtered search |

### Reference Checking

| Prompt | What it does |
|---|---|
| `Which pages use /content/dam/site/hero.jpg?` | Finds published pages referencing the asset |
| `Check references for /content/dam/site/logo.png including unpublished pages` | Includes draft/unpublished pages |

### Expiration Management

| Prompt | What it does |
|---|---|
| `Extend /content/dam/site/doc.pdf by 2 years` | Adds 2 years to current expiration |
| `Set expiration of /content/dam/site/banner.jpg to 2027-12-31` | Sets a specific date |

### Log Analysis

| Prompt | What it does |
|---|---|
| `Show me errors from the last 24 hours` | Recent error log entries |
| `Find 404 errors in DAM` | DAM-specific 404s |
| `Publishing errors in the last 2 hours` | Replication/publish issues |
| `Workflow errors from the last 7 days` | Workflow-related failures |

### Multi-Step Workflows

```
Find all expired assets, check which ones are still referenced by published pages,
and extend by 1 year any that are actively used.
```

```
Show me assets expiring in the next 7 days, then check if any are used on
published pages — I want to prioritize renewals.
```

## AEM Requirements

Your AEM instance needs:

- **QueryBuilder API** — enabled by default on AEM
- **REST API access** — for asset metadata updates
- **Service account permissions:**
  - Read access to `/content/dam` (assets)
  - Read access to `/content` (pages)
  - Write access to asset metadata on author (for `extend_asset_expiration`)
  - Access to both author and publish instances

## Troubleshooting

| Problem | Solution |
|---|---|
| Hammer icon not visible (Claude Desktop) | Check the config file path and JSON syntax. Restart Claude Desktop completely. |
| Server not connected (Cursor) | Open Settings → MCP and click the refresh button. Check JSON syntax in `.cursor/mcp.json`. |
| "Cannot connect to AEM" | Verify `AEM_AUTHOR_URL` and `AEM_PUBLISH_URL`. Check credentials and network access. |
| "Asset has no expiration date" | Only assets with `prism:expirationDate` metadata are tracked. |
| "No pages found" | Asset may be referenced programmatically. Try `includeUnpublished: true`. |

### Multi-Step Workflows

```
Find all expired assets, check which ones are still referenced by published pages,
and extend by 1 year any that are actively used.
```

```
Show me assets expiring in the next 7 days, then check if any are used on
published pages — I want to prioritize renewals.
```

## AEM Requirements

Your AEM instance needs:

- **QueryBuilder API** — enabled by default on AEM
- **REST API access** — for asset metadata updates
- **Service account permissions:**
  - Read access to `/content/dam` (assets)
  - Read access to `/content` (pages)
  - Write access to asset metadata on author (for `extend_asset_expiration`)
  - Access to both author and publish instances

## Troubleshooting

| Problem | Solution |
|---|---|
| Hammer icon not visible | Check the config file path and JSON syntax. Restart Claude Desktop completely. |
| "Cannot connect to AEM" | Verify `AEM_AUTHOR_URL` and `AEM_PUBLISH_URL`. Check credentials and network access. |
| "Asset has no expiration date" | Only assets with `prism:expirationDate` metadata are tracked. |
| "No pages found" | Asset may be referenced programmatically. Try `includeUnpublished: true`. |
| 0 results for log queries | Check the time range — logs may not go back far enough. Try `7d` instead of `24h`. |
| Tools not appearing | Run `npm run build` and restart Claude Desktop. |

## Development

```bash
npm run build     # Compile TypeScript
npm run dev       # Watch mode (auto-recompile on changes)
```
