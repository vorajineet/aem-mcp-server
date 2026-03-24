/**
 * Tool to extend asset expiration dates
 */

import { AEMClient } from '../aem/aem-client.js';
import { addYears, formatDate } from '../utils/date-utils.js';

export interface ExtendExpirationInput {
  assetPath: string;
  yearsToAdd?: number;
  customDate?: string; // ISO format YYYY-MM-DD
}

export async function extendAssetExpiration(
  client: AEMClient,
  input: ExtendExpirationInput
): Promise<string> {
  if (!input.assetPath) {
    throw new Error('assetPath is required');
  }

  try {
    let newExpirationDate: string;

    if (input.customDate) {
      newExpirationDate = input.customDate;
    } else {
      const yearsToAdd = input.yearsToAdd || 1;
      const newDate = addYears(new Date(), yearsToAdd);
      newExpirationDate = formatDate(newDate);
    }

    const success = await client.updateAssetExpiration(
      input.assetPath,
      newExpirationDate
    );

    if (success) {
      return `Successfully extended expiration for ${input.assetPath} to ${newExpirationDate}`;
    } else {
      throw new Error('Update failed');
    }
  } catch (error) {
    throw new Error(
      `Failed to extend asset expiration: ${String(error)}`
    );
  }
}
