/**
 * IframeMessenger
 * 
 * Handles communication with parent window when application is embedded as iframe.
 * Provides methods to:
 * - Detect if application is embedded in an iframe
 * - Send completion status messages to parent window
 * - Handle cases where parent window doesn't exist
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

export class IframeMessenger {
  /**
   * Check if application is embedded in an iframe
   * 
   * @returns true if embedded in iframe, false otherwise
   * 
   * Requirement 10.4: Detect parent window context
   * Requirement 10.5: Handle non-embedded scenario gracefully
   */
  isEmbedded(): boolean {
    try {
      // Check if window.parent exists and is different from current window
      return window.parent !== window;
    } catch (error) {
      // In case of cross-origin restrictions, assume not embedded
      console.warn('[IframeMessenger] Unable to determine iframe status:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Send completion status to parent window
   * 
   * @param success - true for successful recognition, false for max attempts exceeded
   * 
   * Requirement 10.1: Send "True" message on successful recognition
   * Requirement 10.2: Send "False" message when max attempts exceeded
   * Requirement 10.5: Handle non-embedded scenario gracefully
   */
  sendCompletionStatus(success: boolean): void {
    // Only send message if embedded in iframe
    if (!this.isEmbedded()) {
      console.log('[IframeMessenger] Not embedded in iframe, skipping postMessage');
      return;
    }

    try {
      // Send message to parent window
      const message = success ? 'True' : 'False';
      this.postMessageToParent(message);
    } catch (error) {
      // Handle cases where parent window doesn't exist or is inaccessible
      console.error('[IframeMessenger] Failed to send message to parent window:', {
        success,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Don't throw - this is not critical to the user experience
    }
  }

  /**
   * Send message to parent window using postMessage API
   * 
   * @param message - Message string to send
   * 
   * Requirement 10.3: Use postMessage API for parent communication
   */
  postMessageToParent(message: string): void {
    try {
      // Use '*' as target origin for maximum compatibility
      // In production, this should be restricted to specific origin
      // e.g., 'http://personal-zx6yray0.outsystemscloud.com'
      window.parent.postMessage(message, '*');
      console.log(`[IframeMessenger] Message sent to parent: ${message}`);
    } catch (error) {
      console.error('[IframeMessenger] Failed to post message to parent:', {
        message,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

// Export singleton instance
export const iframeMessenger = new IframeMessenger();
