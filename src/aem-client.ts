/**
 * AEM REST API client for DAM and content operations
 */

import { AEMConfig, getBasicAuth } from './asset-config.js';

export interface Asset {
  path: string;
  name: string;
  title?: string;
  expirationDate?: string;
  daysUntilExpiration?: number;
  daysSinceExpiration?: number;
  status?: string;
  lastModified?: string;
}

export interface PageReference {
  path: string;
  title?: string;
  status?: string;
  lastPublished?: string;
}

export interface QueryResult {
  hits: Array<{
    path: string;
    name: string;
    properties?: Record<string, any>;
  }>;
  total: number;
}

export class AEMClient {
  private config: AEMConfig;
  private authHeader: string;

  constructor(config: AEMConfig) {
    this.config = config;
    this.authHeader = getBasicAuth(config.username, config.password);
  }

  /**
   * Get expired assets from DAM
   * Queries for assets where prism:expirationDate is in the past
   */
  async getExpiredAssets(): Promise<Asset[]> {
    const now = new Date().toISOString();
    
    // Query for all assets that have the prism:expirationDate property
    // (We'll do date filtering client-side to avoid complex QueryBuilder syntax)
    const params = new URLSearchParams({
      path: '/content/dam',
      type: 'dam:Asset',
      property: 'jcr:content/metadata/prism:expirationDate',
      'property.operation': 'exists',
      orderby: 'jcr:created',
      orderby_sort: 'desc',
      p_limit: '1000',
      p_offset: '0',
    });

    try {
      const url = `${this.config.authorUrl}/bin/querybuilder.json?${params}`;
      console.error('[DEBUG] QueryBuilder URL:', url);
      console.error('[DEBUG] Current time for comparison:', now);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `QueryBuilder request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as QueryResult;
      console.error('[DEBUG] QueryBuilder returned', result.hits.length, 'hits');
      console.error('[DEBUG] Raw hits:', JSON.stringify(result.hits, null, 2));
      
      const nowDate = new Date();
      
      // For each asset returned by QueryBuilder, fetch the actual property value from JCR
      const assets: Asset[] = [];
      for (const hit of result.hits) {
        try {
          // Fetch the asset's metadata properties
          const propResponse = await fetch(
            `${this.config.authorUrl}${hit.path}/jcr:content/metadata.json`,
            {
              method: 'GET',
              headers: {
                Authorization: this.authHeader,
                Accept: 'application/json',
              },
            }
          );
          
          let expirationDate = undefined;
          if (propResponse.ok) {
            const metadata = (await propResponse.json()) as Record<string, any>;
            expirationDate = metadata['prism:expirationDate'];
            console.error(`[DEBUG] Fetched ${hit.path}: expirationDate="${expirationDate}"`);
          } else {
            console.error(`[DEBUG] Failed to fetch metadata for ${hit.path}: ${propResponse.status}`);
          }
          
          // Only include if we got a valid expiration date that is in the past
          if (expirationDate) {
            const expDate = new Date(expirationDate);
            const isExpired = expDate < nowDate;
            console.error(`[DEBUG] ${hit.path}: expirationDate="${expirationDate}", isExpired=${isExpired}`);
            
            if (isExpired) {
              assets.push({
                path: hit.path,
                name: hit.name,
                title: hit.properties?.['jcr:title'] || hit.name,
                expirationDate,
                lastModified: hit.properties?.['jcr:lastModified'],
              });
            }
          }
        } catch (error) {
          console.error(`[DEBUG] Error processing ${hit.path}:`, String(error));
        }
      }
      
      console.error('[DEBUG] Final assets after filtering:', JSON.stringify(assets, null, 2));
      return assets;
    } catch (error) {
      throw new Error(`Failed to fetch expired assets: ${String(error)}`);
    }
  }

  /**
   * Get assets that will expire within a given timeframe
   */
  async getExpiringAssets(timeframeMs: number): Promise<Asset[]> {
    // Query for all assets that have the prism:expirationDate property
    const params = new URLSearchParams({
      path: '/content/dam',
      type: 'dam:Asset',
      property: 'jcr:content/metadata/prism:expirationDate',
      'property.operation': 'exists',
      orderby: 'jcr:created',
      orderby_sort: 'desc',
      p_limit: '1000',
      p_offset: '0',
    });

    try {
      const url = `${this.config.authorUrl}/bin/querybuilder.json?${params}`;
      console.error('[DEBUG] Expiring assets query URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `QueryBuilder request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as QueryResult;
      console.error('[DEBUG] QueryBuilder returned', result.hits.length, 'hits');
      
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() + timeframeMs);
      
      console.error('[DEBUG] Current time:', now.toISOString());
      console.error('[DEBUG] Expiration threshold:', expirationThreshold.toISOString());
      
      // For each asset, fetch the actual property value and check if it's within timeframe
      const assets: Asset[] = [];
      for (const hit of result.hits) {
        try {
          // Fetch the asset's metadata properties
          const propResponse = await fetch(
            `${this.config.authorUrl}${hit.path}/jcr:content/metadata.json`,
            {
              method: 'GET',
              headers: {
                Authorization: this.authHeader,
                Accept: 'application/json',
              },
            }
          );
          
          let expirationDate = undefined;
          if (propResponse.ok) {
            const metadata = (await propResponse.json()) as Record<string, any>;
            expirationDate = metadata['prism:expirationDate'];
            console.error(`[DEBUG] Fetched ${hit.path}: expirationDate="${expirationDate}"`);
          }
          
          // Check if asset expires within the timeframe but hasn't expired yet
          if (expirationDate) {
            const expDate = new Date(expirationDate);
            const daysUntilExpiration = Math.ceil(
              (expDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            );
            const isExpiringWithinTimeframe = expDate > now && expDate <= expirationThreshold;
            
            console.error(
              `[DEBUG] ${hit.path}: expirationDate="${expirationDate}", daysUntilExpiration=${daysUntilExpiration}, inTimeframe=${isExpiringWithinTimeframe}`
            );
            
            if (isExpiringWithinTimeframe) {
              assets.push({
                path: hit.path,
                name: hit.name,
                title: hit.properties?.['jcr:title'] || hit.name,
                expirationDate,
                daysUntilExpiration,
                lastModified: hit.properties?.['jcr:lastModified'],
              });
            }
          }
        } catch (error) {
          console.error(`[DEBUG] Error processing ${hit.path}:`, String(error));
        }
      }
      
      // Sort by days until expiration (ascending - soonest first)
      assets.sort((a, b) => (a.daysUntilExpiration || 0) - (b.daysUntilExpiration || 0));
      
      console.error('[DEBUG] Final expiring assets:', JSON.stringify(assets, null, 2));
      return assets;
    } catch (error) {
      throw new Error(`Failed to fetch expiring assets: ${String(error)}`);
    }
  }

  /**
   * Get assets that have expired within a given timeframe (looking backward in time)
   */
  async getRecentlyExpiredAssets(timeframeMs: number): Promise<Asset[]> {
    // Query for all assets that have the prism:expirationDate property
    const params = new URLSearchParams({
      path: '/content/dam',
      type: 'dam:Asset',
      property: 'jcr:content/metadata/prism:expirationDate',
      'property.operation': 'exists',
      orderby: 'jcr:created',
      orderby_sort: 'desc',
      p_limit: '1000',
      p_offset: '0',
    });

    try {
      const url = `${this.config.authorUrl}/bin/querybuilder.json?${params}`;
      console.error('[DEBUG] Recently expired assets query URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `QueryBuilder request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as QueryResult;
      console.error('[DEBUG] QueryBuilder returned', result.hits.length, 'hits');
      
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() - timeframeMs);
      
      console.error('[DEBUG] Current time:', now.toISOString());
      console.error('[DEBUG] Recently expired threshold (how far back):', expirationThreshold.toISOString());
      
      // For each asset, fetch the actual property value and check if it expired recently
      const assets: Asset[] = [];
      for (const hit of result.hits) {
        try {
          // Fetch the asset's metadata properties
          const propResponse = await fetch(
            `${this.config.authorUrl}${hit.path}/jcr:content/metadata.json`,
            {
              method: 'GET',
              headers: {
                Authorization: this.authHeader,
                Accept: 'application/json',
              },
            }
          );
          
          let expirationDate = undefined;
          if (propResponse.ok) {
            const metadata = (await propResponse.json()) as Record<string, any>;
            expirationDate = metadata['prism:expirationDate'];
            console.error(`[DEBUG] Fetched ${hit.path}: expirationDate="${expirationDate}"`);
          }
          
          // Check if asset expired within the timeframe (in the past)
          if (expirationDate) {
            const expDate = new Date(expirationDate);
            const daysSinceExpiration = Math.ceil(
              (now.getTime() - expDate.getTime()) / (24 * 60 * 60 * 1000)
            );
            const expiredRecently = expDate < now && expDate >= expirationThreshold;
            
            console.error(
              `[DEBUG] ${hit.path}: expirationDate="${expirationDate}", daysSinceExpiration=${daysSinceExpiration}, expiredRecently=${expiredRecently}`
            );
            
            if (expiredRecently) {
              assets.push({
                path: hit.path,
                name: hit.name,
                title: hit.properties?.['jcr:title'] || hit.name,
                expirationDate,
                daysSinceExpiration,
                lastModified: hit.properties?.['jcr:lastModified'],
              });
            }
          }
        } catch (error) {
          console.error(`[DEBUG] Error processing ${hit.path}:`, String(error));
        }
      }
      
      // Sort by days since expiration (ascending - most recently expired first)
      assets.sort((a, b) => (a.daysSinceExpiration || 0) - (b.daysSinceExpiration || 0));
      
      console.error('[DEBUG] Final recently expired assets:', JSON.stringify(assets, null, 2));
      return assets;
    } catch (error) {
      throw new Error(`Failed to fetch recently expired assets: ${String(error)}`);
    }
  }

  /**
   * Find all pages that reference an asset and check if they are published
   */
  async getAssetReferences(assetPath: string): Promise<PageReference[]> {
    // Search for pages on AUTHOR that contain references to this asset
    const params = new URLSearchParams({
      path: '/content',
      type: 'cq:Page',
      fulltext: assetPath,
      p_limit: '1000',
      p_offset: '0',
    });

    try {
      const url = `${this.config.authorUrl}/bin/querybuilder.json?${params}`;
      console.error('[DEBUG] Reference query URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Reference query failed: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as QueryResult;
      console.error('[DEBUG] Reference query returned', result.hits.length, 'pages');

      // For each page, check if it has been published/activated
      const publishedPages: PageReference[] = [];
      
      for (const hit of result.hits) {
        try {
          // Fetch the page's properties to check replication status
          const pagePropsResponse = await fetch(
            `${this.config.authorUrl}${hit.path}/jcr:content.json`,
            {
              method: 'GET',
              headers: {
                Authorization: this.authHeader,
                Accept: 'application/json',
              },
            }
          );
          
          if (pagePropsResponse.ok) {
            const pageProps = (await pagePropsResponse.json()) as Record<string, any>;
            // Check if page has been published by looking for cq:lastReplicated
            const isPublished = pageProps['cq:lastReplicated'] !== undefined || 
                               pageProps['cq:lastReplicatedby'] !== undefined;
            
            console.error(`[DEBUG] ${hit.path}: isPublished=${isPublished}, lastReplicated=${pageProps['cq:lastReplicated']}`);
            
            if (isPublished) {
              publishedPages.push({
                path: hit.path,
                title: pageProps['jcr:title'] || hit.name,
                status: 'published',
                lastPublished: pageProps['cq:lastReplicated'],
              });
            }
          }
        } catch (error) {
          console.error(`[DEBUG] Failed to check publication status for ${hit.path}:`, String(error));
        }
      }
      
      console.error('[DEBUG] Found', publishedPages.length, 'published pages referencing the asset');
      return publishedPages;
    } catch (error) {
      throw new Error(
        `Failed to find asset references: ${String(error)}`
      );
    }
  }

  /**
   * Update asset expiration date
   */
  async updateAssetExpiration(
    assetPath: string,
    newExpirationDate: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.authorUrl}${assetPath}/jcr:content.json`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'jcr:content/metadata/prism:expirationDate': newExpirationDate,
            '_charset_': 'utf-8',
          }).toString(),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Update failed: ${response.status} ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        `Failed to update asset expiration: ${String(error)}`
      );
    }
  }

  /**
   * Download logs zip file from AEM
   */
  async downloadLogsZip(): Promise<Buffer> {
    const url = `${this.config.authorUrl}/system/console/status-slinglogs.zip`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download logs: ${response.statusText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw new Error(
        `Error downloading logs zip: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
