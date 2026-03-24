/**
 * Configuration management for AEM DAM Expiration tool
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env file from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

export interface AEMConfig {
  authorUrl: string;
  publishUrl: string;
  username: string;
  password: string;
}

export function loadConfig(): AEMConfig {
  const authorUrl = process.env.AEM_AUTHOR_URL;
  const publishUrl = process.env.AEM_PUBLISH_URL;
  const username = process.env.AEM_USERNAME;
  const password = process.env.AEM_PASSWORD;

  if (!authorUrl || !publishUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: AEM_AUTHOR_URL, AEM_PUBLISH_URL, AEM_USERNAME, AEM_PASSWORD\n' +
      'Add them to .env file in the project root or set them as environment variables.'
    );
  }

  return {
    authorUrl,
    publishUrl,
    username,
    password,
  };
}

export function getBasicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}
