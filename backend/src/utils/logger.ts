/**
 * Logging utility for conditional debug logging
 */

/**
 * Check if debug logging is enabled (checked dynamically)
 */
function isDebugEnabled(): boolean {
  return process.env.DEBUG_LOGGING === 'true';
}

/**
 * Log debug information only if DEBUG_LOGGING is enabled
 */
export function debugLog(message: string, data?: any): void {
  if (isDebugEnabled()) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

/**
 * Always log important information (errors, warnings, security events)
 */
export function infoLog(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Always log warnings
 */
export function warnLog(message: string): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] ${message}`);
}

/**
 * Always log errors
 */
export function errorLog(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  if (data) {
    console.error(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.error(`[${timestamp}] ${message}`);
  }
}
