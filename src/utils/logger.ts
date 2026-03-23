/**
 * Logger utility for controlled debug output
 * Respects DEBUG environment variable
 */

const DEBUG = process.env.DEBUG === 'true';
const VERBOSE_DEBUG = process.env.DEBUG_VERBOSE === 'true';

export const logger = {
  /**
   * Log debug messages (only shown if DEBUG=true)
   */
  debug(tag: string, message: string, data?: any): void {
    if (DEBUG) {
      console.error(`[${tag}]`, message, data || '');
    }
  },

  /**
   * Log info messages (always shown)
   */
  info(tag: string, message: string): void {
    console.error(`[${tag}]`, message);
  },

  /**
   * Log error messages (always shown)
   */
  error(tag: string, message: string, error?: any): void {
    console.error(`[${tag} ERROR]`, message, error || '');
  },

  /**
   * Log with verbose detail (only shown if DEBUG_VERBOSE=true)
   */
  verboseDebug(tag: string, message: string, data?: any): void {
    if (VERBOSE_DEBUG && DEBUG) {
      console.error(`[${tag} VERBOSE]`, message, JSON.stringify(data, null, 2));
    }
  },

  /**
   * Check if debugging is enabled
   */
  isDebugEnabled(): boolean {
    return DEBUG;
  },

  /**
   * Check if verbose debugging is enabled
   */
  isVerboseDebugEnabled(): boolean {
    return VERBOSE_DEBUG && DEBUG;
  },
};
