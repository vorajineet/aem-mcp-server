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
   * Internal fetch wrapper for AEM API calls
   */
  private async aemFetch(url: string, method: 'GET' | 'POST' = 'GET', body?: string): Promise<any> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }),
      },
      ...(body && { body }),
    });

    if (!response.ok) {
      throw new Error(`AEM request failed: ${response.status} ${response.statusText} (${url})`);
    }

    // POST requests may not return JSON
    return method === 'GET' ? response.json() : true;
  }

  /**
   * Get expired assets from DAM
   * Queries for assets where prism:expirationDate is in the past
   */
  async getExpiredAssets(): Promise<Asset[]> {
    const now = new Date().toISOString();
    
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
      
      const result = (await this.aemFetch(url)) as QueryResult;
      console.error('[DEBUG] QueryBuilder returned', result.hits.length, 'hits');
      
      const nowDate = new Date();
      
      // Batch fetch all metadata in parallel
      const metadataPromises = result.hits.map(hit =>
        this.aemFetch(
          `${this.config.authorUrl}${hit.path}/jcr:content/metadata.json`
        ).catch(() => null) // Handle failed requests gracefully
      );
      
      const metadataResults = await Promise.all(metadataPromises);
      console.error('[DEBUG] Fetched metadata for', result.hits.length, 'assets');
      
      // Process results
      const assets: Asset[] = [];
      for (let i = 0; i < result.hits.length; i++) {
        const hit = result.hits[i];
        const metadata = metadataResults[i];
        
        if (metadata) {
          const expirationDate = metadata['prism:expirationDate'];
          
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
        }
      }
      
      console.error('[DEBUG] Final assets after filtering:', assets.length, 'expired assets');
      return assets;
    } catch (error) {
      throw new Error(`Failed to fetch expired assets: ${String(error)}`);
    }
  }

  /**
   * Get assets that will expire within a given timeframe
   */
  async getExpiringAssets(timeframeMs: number): Promise<Asset[]> {
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
      
      const result = (await this.aemFetch(url)) as QueryResult;
      console.error('[DEBUG] QueryBuilder returned', result.hits.length, 'hits');
      
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() + timeframeMs);
      console.error('[DEBUG] Current time:', now.toISOString());
      console.error('[DEBUG] Expiration threshold:', expirationThreshold.toISOString());
      
      // Batch fetch all metadata in parallel
      const metadataPromises = result.hits.map(hit =>
        this.aemFetch(
          `${this.config.authorUrl}${hit.path}/jcr:content/metadata.json`
        ).catch(() => null)
      );
      
      const metadataResults = await Promise.all(metadataPromises);
      console.error('[DEBUG] Fetched metadata for', result.hits.length, 'assets');
      
      // Process results
      const assets: Asset[] = [];
      for (let i = 0; i < result.hits.length; i++) {
        const hit = result.hits[i];
        const metadata = metadataResults[i];
        
        if (metadata) {
          const expirationDate = metadata['prism:expirationDate'];
          
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
        }
      }
      
      // Sort by days until expiration (ascending - soonest first)
      assets.sort((a, b) => (a.daysUntilExpiration || 0) - (b.daysUntilExpiration || 0));
      console.error('[DEBUG] Final expiring assets:', assets.length, 'assets');
      
      return assets;
    } catch (error) {
      throw new Error(`Failed to fetch expiring assets: ${String(error)}`);
    }
  }

  /**
   * Get assets that have expired within a given timeframe (looking backward in time)
   */
  async getRecentlyExpiredAssets(timeframeMs: number): Promise<Asset[]> {
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
      
      const result = (await this.aemFetch(url)) as QueryResult;
      console.error('[DEBUG] QueryBuilder returned', result.hits.length, 'hits');
      
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() - timeframeMs);
      console.error('[DEBUG] Current time:', now.toISOString());
      console.error('[DEBUG] Recently expired threshold (how far back):', expirationThreshold.toISOString());
      
      // Batch fetch all metadata in parallel
      const metadataPromises = result.hits.map(hit =>
        this.aemFetch(
          `${this.config.authorUrl}${hit.path}/jcr:content/metadata.json`
        ).catch(() => null)
      );
      
      const metadataResults = await Promise.all(metadataPromises);
      console.error('[DEBUG] Fetched metadata for', result.hits.length, 'assets');
      
      // Process results
      const assets: Asset[] = [];
      for (let i = 0; i < result.hits.length; i++) {
        const hit = result.hits[i];
        const metadata = metadataResults[i];
        
        if (metadata) {
          const expirationDate = metadata['prism:expirationDate'];
          
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
        }
      }
      
      // Sort by days since expiration (ascending - most recently expired first)
      assets.sort((a, b) => (a.daysSinceExpiration || 0) - (b.daysSinceExpiration || 0));
      console.error('[DEBUG] Final recently expired assets:', assets.length, 'assets');
      
      return assets;
    } catch (error) {
      throw new Error(`Failed to fetch recently expired assets: ${String(error)}`);
    }
  }

  /**
   * Find all pages that reference an asset and check if they are published
   */
  async getAssetReferences(assetPath: string): Promise<PageReference[]> {
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
      
      const result = (await this.aemFetch(url)) as QueryResult;
      console.error('[DEBUG] Reference query returned', result.hits.length, 'pages');

      // Batch fetch all page properties in parallel
      const pagePropsPromises = result.hits.map(hit =>
        this.aemFetch(
          `${this.config.authorUrl}${hit.path}/jcr:content.json`
        ).catch(() => null)
      );
      
      const pagePropsResults = await Promise.all(pagePropsPromises);
      console.error('[DEBUG] Fetched properties for', result.hits.length, 'pages');
      
      // Process results
      const publishedPages: PageReference[] = [];
      for (let i = 0; i < result.hits.length; i++) {
        const hit = result.hits[i];
        const pageProps = pagePropsResults[i];
        
        if (pageProps) {
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
      const url = `${this.config.authorUrl}${assetPath}/jcr:content.json`;
      const body = new URLSearchParams({
        'jcr:content/metadata/prism:expirationDate': newExpirationDate,
        '_charset_': 'utf-8',
      }).toString();
      
      await this.aemFetch(url, 'POST', body);
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
