/**
 * Tool to list assets that expired recently within a specified timeframe
 */

import { AEMClient } from '../aem-client.js';

export interface ListRecentlyExpiredInput {
  timeframe: string;
}

/**
 * Parse timeframe string (e.g., "30 days", "2 months", "1 hour")
 * Returns milliseconds
 */
function parseTimeframe(timeframe: string): number {
  const match = timeframe.toLowerCase().trim().match(/^(\d+)\s*(hour|day|month|year)s?$/);
  
  if (!match) {
    throw new Error(
      'Invalid timeframe format. Use formats like: "1 hour", "30 days", "2 months", "1 year", etc.'
    );
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  
  let milliseconds = 0;
  switch (unit) {
    case 'hour':
      milliseconds = amount * 60 * 60 * 1000;
      break;
    case 'day':
      milliseconds = amount * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      milliseconds = amount * 30 * 24 * 60 * 60 * 1000; // Approximate: 30 days per month
      break;
    case 'year':
      milliseconds = amount * 365 * 24 * 60 * 60 * 1000; // Approximate: 365 days per year
      break;
  }
  
  return milliseconds;
}

export async function listRecentlyExpired(
  client: AEMClient,
  input: ListRecentlyExpiredInput
): Promise<string> {
  try {
    const timeframeMs = parseTimeframe(input.timeframe);
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
