/**
 * Tool to list assets expiring within a specified timeframe
 */

import { AEMClient } from '../aem-client.js';
import { parseNaturalLanguageTimeframe } from '../utils/timeframe-parser.js';

export interface ListExpiringSoonInput {
  timeframe: string;
}

export async function listExpiringSoon(
  client: AEMClient,
  input: ListExpiringSoonInput
): Promise<string> {
  try {
    const timeframeMs = parseNaturalLanguageTimeframe(input.timeframe);
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
