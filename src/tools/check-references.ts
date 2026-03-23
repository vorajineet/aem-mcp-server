/**
 * Tool to check which published pages reference an asset
 */

import { AEMClient } from '../aem-client.js';

export interface CheckReferencesInput {
  assetPath: string;
}

export async function checkAssetReferences(
  client: AEMClient,
  input: CheckReferencesInput
): Promise<string> {
  if (!input.assetPath) {
    throw new Error('assetPath is required');
  }

  try {
    const references = await client.getAssetReferences(input.assetPath);

    if (references.length === 0) {
      return `Asset ${input.assetPath} is not referenced in any published pages.`;
    }

    const details = references
      .map(
        (ref) =>
          `• ${ref.path}\n` +
          `  Title: ${ref.title || 'no title'}\n` +
          `  Last Published: ${ref.lastPublished || 'unknown'}`
      )
      .join('\n');

    return `Found ${references.length} published pages referencing asset:\n${details}`;
  } catch (error) {
    throw new Error(
      `Failed to check asset references: ${String(error)}`
    );
  }
}
