/**
 * Unified tool to list assets by expiration status:
 * - expired: all assets past their expiration date
 * - expiring-soon: assets approaching expiration within a timeframe
 * - recently-expired: assets that expired within a recent timeframe
 */

import { AEMClient } from '../aem-client.js';
import { parseNaturalLanguageTimeframe } from '../utils/timeframe-parser.js';

export interface ListAssetsByExpirationInput {
  status: 'expired' | 'expiring-soon' | 'recently-expired';
  timeframe?: string;
  filter?: string;
}

export async function listAssetsByExpiration(
  client: AEMClient,
  input: ListAssetsByExpirationInput
): Promise<string> {
  const { status, timeframe, filter } = input;

  if ((status === 'expiring-soon' || status === 'recently-expired') && !timeframe) {
    throw new Error(`Timeframe is required for status "${status}". Example: "30 days", "2 months", "1 year"`);
  }

  try {
    let assets: any[];
    let label: string;

    switch (status) {
      case 'expired':
        assets = await client.getExpiredAssets();
        label = 'expired';
        break;

      case 'expiring-soon': {
        const timeframeMs = parseNaturalLanguageTimeframe(timeframe!);
        assets = await client.getExpiringAssets(timeframeMs);
        label = `expiring within ${timeframe}`;
        break;
      }

      case 'recently-expired': {
        const timeframeMs = parseNaturalLanguageTimeframe(timeframe!);
        assets = await client.getRecentlyExpiredAssets(timeframeMs);
        label = `expired within the last ${timeframe}`;
        break;
      }

      default:
        throw new Error(`Invalid status: "${status}". Must be "expired", "expiring-soon", or "recently-expired"`);
    }

    // Apply optional filter
    if (filter) {
      assets = assets.filter(
        (asset) =>
          asset.path.includes(filter) ||
          asset.name?.includes(filter)
      );
    }

    if (assets.length === 0) {
      const filterMsg = filter ? ` matching "${filter}"` : '';
      return `No ${label} assets found${filterMsg}.`;
    }

    const details = assets
      .map((asset) => {
        let info = `• ${asset.path}\n  Name: ${asset.name}\n`;
        if (status === 'expired') {
          info += `  Expired At: ${asset.expirationDate || 'unknown'}\n`;
        } else if (status === 'expiring-soon') {
          info += `  Expires At: ${asset.expirationDate || 'unknown'}\n`;
          info += `  Days Until Expiration: ${asset.daysUntilExpiration || 'N/A'}\n`;
        } else {
          info += `  Expired At: ${asset.expirationDate || 'unknown'}\n`;
          info += `  Days Since Expiration: ${asset.daysSinceExpiration || 'N/A'}\n`;
        }
        return info;
      })
      .join('\n');

    const filterMsg = filter ? ` matching "${filter}"` : '';
    return `Found ${assets.length} ${label} assets${filterMsg}:\n\n${details}`;
  } catch (error) {
    throw new Error(`Failed to list assets by expiration: ${String(error)}`);
  }
}
