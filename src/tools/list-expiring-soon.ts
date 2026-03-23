/**
 * Tool to list assets expiring within a specified timeframe
 */

import { AEMClient } from '../aem-client.js';

export interface ListExpiringSoonInput {
  timeframe: string;
}

/**
 * Parse timeframe string (e.g., "30 days", "2 months", "6 months")
 * Returns milliseconds
 */
function parseTimeframe(timeframe: string): number {
  const match = timeframe.toLowerCase().trim().match(/^(\d+)\s*(day|month|year)s?$/);
  
  if (!match) {
    throw new Error(
      'Invalid timeframe format. Use formats like: "30 days", "2 months", "1 year", etc.'
    );
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  
  let milliseconds = 0;
  switch (unit) {
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

export async function listExpiringSoon(
  client: AEMClient,
  input: ListExpiringSoonInput
): Promise<string> {
  try {
    const timeframeMs = parseTimeframe(input.timeframe);
    const expiringAssets = await client.getExpiringAssets(timeframeMs);

    if (expiringAssets.length === 0) {
      return `No assets expiring within the next ${input.timeframe}.`;
    }

    const details = expiringAssets
      .map(
        (asset) =>
          `• ${asset.path}\n` +
          `  Name: ${asset.name}\n` +
          `  Expires at: ${asset.expirationDate || 'unknown'}\n` +
          `  Days until expiration: ${asset.daysUntilExpiration || 'N/A'}\n`
      )
      .join('\n');

    return `Found ${expiringAssets.length} assets expiring within ${input.timeframe}:\n\n${details}`;
  } catch (error) {
    throw new Error(
      `Failed to list expiring assets: ${String(error)}`
    );
  }
}
