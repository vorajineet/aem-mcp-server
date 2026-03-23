/**
 * Tool to list assets that expired recently within a specified timeframe
 */

import { AEMClient } from '../aem-client.js';
import { parseNaturalLanguageTimeframe } from '../utils/timeframe-parser.js';

export interface ListRecentlyExpiredInput {
  timeframe: string;
}

export async function listRecentlyExpired(
  client: AEMClient,
  input: ListRecentlyExpiredInput
): Promise<string> {
  try {
    const timeframeMs = parseNaturalLanguageTimeframe(input.timeframe);
    const recentlyExpiredAssets = await client.getRecentlyExpiredAssets(timeframeMs);

    if (recentlyExpiredAssets.length === 0) {
      return `No assets expired within the last ${input.timeframe}.`;
    }

    const details = recentlyExpiredAssets
      .map(
        (asset) =>
          `• ${asset.path}\n` +
          `  Name: ${asset.name}\n` +
          `  Expired at: ${asset.expirationDate || 'unknown'}\n` +
          `  Days since expiration: ${asset.daysSinceExpiration || 'N/A'}\n`
      )
      .join('\n');

    return `Found ${recentlyExpiredAssets.length} assets that expired within the last ${input.timeframe}:\n\n${details}`;
  } catch (error) {
    throw new Error(
      `Failed to list recently expired assets: ${String(error)}`
    );
  }
}
