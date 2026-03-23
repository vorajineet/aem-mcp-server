/**
 * Timeframe parsing utilities for natural language time ranges
 */

/**
 * Parse natural language timeframe (e.g., "30 days", "2 months", "1 year", "1 hour")
 * Returns milliseconds
 * 
 * @param timeframe - Format: "<number> <unit>" where unit is hour, day, month, or year
 * @returns Milliseconds equivalent
 */
export function parseNaturalLanguageTimeframe(timeframe: string): number {
  const match = timeframe.toLowerCase().trim().match(/^(\d+)\s*(hour|day|month|year)s?$/);
  
  if (!match) {
    throw new Error(
      'Invalid timeframe format. Use formats like: "1 hour", "30 days", "2 months", "1 year"'
    );
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  
  const MS_PER_UNIT = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000, // Approximate: 30 days per month
    year: 365 * 24 * 60 * 60 * 1000, // Approximate: 365 days per year
  } as const;
  
  return amount * MS_PER_UNIT[unit as keyof typeof MS_PER_UNIT];
}

/**
 * Parse compact timeframe format (e.g., "1h", "24h", "7d", "2w")
 * Returns milliseconds
 * 
 * @param timeRange - Format: "<number><unit>" where unit is m (minute), h (hour), d (day), w (week)
 * @returns Milliseconds equivalent
 */
export function parseCompactTimeRange(timeRange: string): number {
  const match = timeRange.match(/^(\d+)([hdmw])$/);
  
  if (!match) {
    throw new Error(
      'Invalid time range format. Use: 1h, 24h, 7d, 2w (where h=hour, d=day, m=minute, w=week)'
    );
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  
  const MS_PER_UNIT = {
    m: 60 * 1000,         // minute
    h: 60 * 60 * 1000,    // hour
    d: 24 * 60 * 60 * 1000, // day
    w: 7 * 24 * 60 * 60 * 1000, // week
  } as const;
  
  return amount * MS_PER_UNIT[unit as keyof typeof MS_PER_UNIT];
}
