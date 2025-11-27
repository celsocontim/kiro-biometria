/**
 * Logging utility for conditional debug logging
 */

const DEBUG_LOGGING = process.env.DEBUG_LOGGING === 'true';

/**
 * Log debug information only if DEBUG_LOGGING is enabled
 */
export function debugLog(message: string, data?: any): void {
  if (DEBUG_LOGGING) {
    console.log(message, data || '');
  }
}

/**
 * Always log important information (errors, warnings, security events)
 */
export function infoLog(message: string): void {
  console.log(message);
}

/**
 * Always log warnings
 */
export function warnLog(message: string): void {
  console.warn(message);
}

/**
 * Always log errors
 */
export function errorLog(message: string, data?: any): void {
  console.error(message, data || '');
}
