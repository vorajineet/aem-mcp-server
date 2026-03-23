/**
 * Tool to list expired assets from AEM DAM
 */

import { AEMClient } from '../aem-client.js';

export interface ListExpiredAssetsInput {
  filter?: string;
}

export async function listExpiredAssets(
  client: AEMClient,
  input: ListExpiredAssetsInput
): Promise<string> {
  try {
    const expiredAssets = await client.getExpiredAssets();

    if (expiredAssets.length === 0) {
      return 'No expired assets found in AEM DAM.';
    }

    // Apply optional filter
    let filtered = expiredAssets;
    if (input.filter) {
      filtered = expiredAssets.filter(
        (asset) =>
          asset.path.includes(input.filter!) ||
          asset.name?.includes(input.filter!)
      );
    }

    if (filtered.length === 0) {
      return `No expired assets match filter: "${input.filter}"`;
    }

    const details = filtered
      .map(
        (asset) =>
          `• ${asset.path}\n` +
          `  Name: ${asset.name}\n` +
          `  Expired At: ${asset.expirationDate || 'unknown'}\n`
      )
      .join('\n');

    return `Found ${filtered.length} expired assets:\n\n${details}`;
  } catch (error) {
    throw new Error(`Failed to list expired assets: ${String(error)}`);
  }
}
