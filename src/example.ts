/**
 * Example usage and integration test for AEM Expiration Manager
 */

import { AEMClient } from './aem-client.js';
import { loadConfig } from './asset-config.js';
import { listExpiredAssets } from './tools/list-expired-assets.js';
import { checkAssetReferences } from './tools/check-references.js';
import { extendAssetExpiration } from './tools/extend-expiration.js';

/**
 * Example: Find expired assets, check references, and extend if referenced
 */
async function exampleWorkflow(): Promise<void> {
  const config = loadConfig();
  const client = new AEMClient(config);

  console.log('=== AEM DAM Expiration Manager Example ===\n');

  try {
    // Step 1: List expired assets
    console.log('Step 1: Finding expired assets...');
    const expiredResult = await listExpiredAssets(client, {});
    console.log(expiredResult);
    console.log('\n---\n');

    // Step 2: For each expired asset, check if it's referenced
    console.log('Step 2: Checking references for expired assets...');
    const exampleAssetPath = '/content/dam/mysite/images/hero.jpg';

    const referencesResult = await checkAssetReferences(client, {
      assetPath: exampleAssetPath,
    });
    console.log(referencesResult);
    console.log('\n---\n');

    // Step 3: If referenced, extend expiration
    console.log('Step 3: Extending expiration for referenced assets...');
    const extensionResult = await extendAssetExpiration(client, {
      assetPath: exampleAssetPath,
      yearsToAdd: 1,
    });
    console.log(extensionResult);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run example (requires AEM connection)
// exampleWorkflow().catch(console.error);
