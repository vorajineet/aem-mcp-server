/**
 * Tool to check which published pages reference an asset
 */

import { AEMClient } from '../aem/aem-client.js';

export interface CheckReferencesInput {
  assetPath: string;
  includeUnpublished?: boolean;
}

export async function checkAssetReferences(
  client: AEMClient,
  input: CheckReferencesInput
): Promise<string> {
  if (!input.assetPath) {
    throw new Error('assetPath is required');
  }

  const includeUnpublished = input.includeUnpublished ?? false;

  try {
    const references = await client.getAssetReferences(input.assetPath, includeUnpublished);

    if (references.length === 0) {
      const scope = includeUnpublished ? 'any' : 'any published';
      return `Asset ${input.assetPath} is not referenced in ${scope} pages.`;
    }

    const details = references
      .map(
        (ref) =>
          `• ${ref.path}\n` +
          `  Title: ${ref.title || 'no title'}\n` +
          `  Status: ${ref.status || 'unknown'}\n` +
          `  Last Published: ${ref.lastPublished || 'N/A'}`
      )
      .join('\n');

    const scope = includeUnpublished ? 'pages (published + unpublished)' : 'published pages';
    return `Found ${references.length} ${scope} referencing asset:\n${details}`;
  } catch (error) {
    throw new Error(
      `Failed to check asset references: ${String(error)}`
    );
  }
}
