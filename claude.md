# AEM MCP Server - Claude Instructions

## Project Overview

This is a **Model Context Protocol (MCP) server** for Adobe Experience Manager (AEM) that provides comprehensive asset lifecycle management and log analysis capabilities for Claude Desktop.

### Core Capabilities
1. **Asset Expiration Management** - Track, find, and extend asset expiration dates
2. **Reference Tracking** - Check which pages use specific assets
3. **Log Analysis** - Query AEM logs with natural language + intelligent caching

## Key Architectural Patterns

### 1. MCP Tool Registration
- All tools are registered in `src/index.ts` as `Tool` objects
- Each tool has: name, description, inputSchema
- Tool handlers are in the CallToolRequestSchema switch statement
- **Important**: The `extend_asset_expiration` tool is a WRITE operation and includes ⚠️ caution warnings

### 2. Asset Client Pattern
- `src/aem-client.ts` is the centralized AEM REST API wrapper
- Uses `private aemFetch()` method for consistent error handling
- Performance optimization: **Batch operations with Promise.all()** instead of sequential fetches
- Example: `getExpiredAssets()`, `getExpiringAssets()` use parallel metadata fetching

### 3. Utility Consolidation
- `src/constants.ts` - Centralized config constants (paths, defaults, cache settings)
- `src/utils/timeframe-parser.ts` - Natural language timeframe parsing
- `src/utils/logger.ts` - Environment-aware logging (respects DEBUG, DEBUG_VERBOSE env vars)
- `src/utils/date-utils.ts` - Date calculations and formatting

### 4. Log Analysis with Caching
- `src/tools/analyze-logs.ts` implements NLP-style query parsing
- **10-minute cache** to avoid re-downloading large log files for follow-up queries
- **Keyword-based cache skipping** - automatically skips cache for queries about "new", "recent", "fresh" data
- Cache stored in `logs-cache/` directory (git-ignored)

## File Structure Quick Reference

```
src/
├── index.ts                    # MCP server entry point - register tools here
├── aem-client.ts              # AEM API wrapper - add new API calls here
├── asset-config.ts            # Environment variable loading
├── constants.ts               # Magic strings and config - keep DRY
├── tools/                     # Each tool gets its own file
│   ├── list-expired-assets.ts
│   ├── list-expiring-soon.ts
│   ├── list-recently-expired.ts
│   ├── check-references.ts
│   ├── extend-expiration.ts  # ⚠️ WRITE OPERATION
│   └── analyze-logs.ts       # Log analysis with caching
└── utils/
    ├── date-utils.ts
    ├── timeframe-parser.ts
    └── logger.ts
```

## Common Tasks

### Adding a New Tool
1. Create `src/tools/my-new-tool.ts` with exported function
2. Import type and function in `src/index.ts`
3. Add Tool definition to TOOLS array
4. Add handler in CallToolRequestSchema switch statement
5. If it modifies content: add ⚠️ warning to description

### Accessing AEM Data
```typescript
const client = new AEMClient(config);
const results = await client.getExpiredAssets();
// For parallel operations, use Promise.all() pattern
const allData = await Promise.all([
  client.getExpiredAssets(),
  client.getExpiringAssets(),
]);
```

### Parsing Natural Language Dates
```typescript
import { parseNaturalLanguageTimeframe } from './utils/timeframe-parser.js';
const ms = parseNaturalLanguageTimeframe('30 days'); // 2592000000
```

### Logging
```typescript
import { logger } from './utils/logger.js';
logger.debug('Detailed info'); // Only if DEBUG=true
logger.info('Always shown');
logger.error('Error message');
logger.verboseDebug('Very detailed'); // Only if DEBUG_VERBOSE=true
```

## Security & Best Practices

### Credential Handling
- Development: Use `.env` file (git-ignored)
- Production: Store in Claude Desktop config `env` section
- **Never commit real credentials**
- Use temporary/expiring tokens instead of passwords

### Write Operations
- Only `extend_asset_expiration` modifies content
- Always include ⚠️ warning in tool description
- Consider adding confirmation prompts for destructive operations

### Performance
- Use `Promise.all()` for parallel API calls (not sequential await loops)
- Implement caching for expensive operations (see analyze-logs.ts pattern)
- Keep log analysis cache validation in mind (10-minute window)

## Testing & Building

```bash
npm run build     # Compile TypeScript
npm run dev       # Watch mode during development
npm run start     # Run the server (requires AEM_* env vars)
```

## Recent Optimizations to Maintain

1. **Parallel fetch pattern** - `aemFetch()` wrapper with batch operations
2. **Centralized constants** - All magic strings in `constants.ts`
3. **Consolidated parsing** - Timeframe logic in dedicated utility
4. **Smart logging** - Environment-aware logger that respects DEBUG flags
5. **Intelligent caching** - Log cache with keyword-based invalidation

## Common Pitfalls to Avoid

- ❌ Sequential fetch loops → ✅ Use Promise.all() with aemFetch()
- ❌ Scattered magic strings → ✅ Add to constants.ts
- ❌ Duplicate parsing logic → ✅ Use timeframe-parser utilities
- ❌ console.log for debug → ✅ Use logger utility
- ❌ Forgetting ⚠️ warnings on write ops → ✅ Always mark in description

## Git Workflow

- Commit related changes together with clear messages
- Example: "Add new tool: bulk_operations" or "Optimize: parallel fetches in aem-client"
- Keep git history clean - squash WIP commits before pushing

## Questions or Issues?

- Check existing tool implementations for patterns
- Review aem-client.ts for AEM API wrapper patterns
- See analyze-logs.ts for caching implementation example
