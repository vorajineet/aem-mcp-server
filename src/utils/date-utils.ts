/**
 * Date utility functions for expiration management
 */

/**
 * Add years to a given date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Check if a date is in the past
 */
export function isExpired(expirationDate: string | Date): boolean {
  const expDate =
    typeof expirationDate === 'string'
      ? new Date(expirationDate)
      : expirationDate;
  return expDate < new Date();
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get next year's date from today
 */
export function getNextYearDate(): Date {
  const today = new Date();
  return addYears(today, 1);
}
