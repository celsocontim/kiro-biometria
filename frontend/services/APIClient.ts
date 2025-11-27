/**
 * APIClient
 * 
 * Handles communication with the backend service.
 * Provides methods to:
 * - Submit capture requests to backend
 * - Handle timeouts and errors
 * - Parse and return recognition responses
 * 
 * Requirements: 2.3, 11.1
 * Performance: Browser automatically handles connection pooling via HTTP/2 and keep-alive
 */

import { CaptureRequest, CaptureResponse } from '../types/api.types';

export class APIClient {
  private readonly backendUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  /**
   * Create a new APIClient instance
   * 
   * @param backendUrl - Base URL of the backend service
   * @param timeout - Request timeout in milliseconds (default: 30000)
   * @param maxRetries - Maximum number of retry attempts for network errors (default: 2)
   * 
   * Note: Modern browsers automatically handle connection pooling and reuse
   * for fetch() requests via HTTP/2 multiplexing and HTTP/1.1 keep-alive.
   * No additional configuration needed on the client side.
   */
  constructor(backendUrl?: string, timeout: number = 30000, maxRetries: number = 2) {
    // Use environment variable or provided URL
    this.backendUrl = backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Submit a capture request to the backend with retry logic
   * 
   * @param imageData - Base64 encoded image data
   * @param userId - User identifier
   * @returns Promise resolving to CaptureResponse
   * @throws Error if request fails or times out
   * 
   * Requirement 2.3: Send image data to Backend Service
   * Requirement 11.1: Communicate via HTTP API
   * Requirements: 1.5, 4.4, 5.4 - Error handling for network errors and timeouts
   */
  async submitCapture(imageData: string, userId: string): Promise<CaptureResponse> {
    let lastError: Error | null = null;

    // Retry logic for network errors
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(imageData, userId);
        
        // If we got a response (even an error response), return it
        // Don't retry for application-level errors (validation, max attempts, etc.)
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Only retry on network errors, not on timeout or other errors
        const isNetworkError = error instanceof TypeError;
        const isLastAttempt = attempt === this.maxRetries;
        
        if (isNetworkError && !isLastAttempt) {
          console.warn(`[APIClient] Network error on attempt ${attempt + 1}, retrying...`, {
            userId,
            error: lastError.message,
            timestamp: new Date().toISOString()
          });
          
          // Exponential backoff: wait 1s, then 2s
          await this.delay(1000 * (attempt + 1));
          continue;
        }
        
        // Don't retry for timeouts or on last attempt
        break;
      }
    }

    // All retries failed, return error response
    console.error('[APIClient] All retry attempts failed:', {
      userId,
      error: lastError?.message,
      attempts: this.maxRetries + 1,
      timestamp: new Date().toISOString()
    });

    return this.handleError(lastError);
  }

  /**
   * Make a single HTTP request to the backend
   * 
   * @param imageData - Base64 encoded image data
   * @param userId - User identifier
   * @returns Promise resolving to CaptureResponse
   * @throws Error if request fails
   */
  private async makeRequest(imageData: string, userId: string): Promise<CaptureResponse> {
    // Create request body
    const requestBody: CaptureRequest = {
      imageData,
      userId,
      timestamp: Date.now()
    };

    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Make HTTP POST request
      const response = await fetch(`${this.backendUrl}/api/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Clear timeout
      clearTimeout(timeoutId);

      // Parse response
      const data: CaptureResponse = await response.json();

      // Log response for debugging
      console.log('[APIClient] Response received:', {
        userId,
        status: response.status,
        success: data.success,
        errorCode: data.errorCode,
        error: data.error,
        fullResponse: data,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle errors and convert to CaptureResponse
   * 
   * @param error - Error that occurred
   * @returns CaptureResponse with error details
   */
  private handleError(error: Error | null): CaptureResponse {
    if (!error) {
      return {
        success: false,
        error: 'An unexpected error occurred.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Handle timeout
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out after 30 seconds. Please check your connection and try again.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Handle network errors
    if (error instanceof TypeError) {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your internet connection and try again.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Handle other errors
    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
      errorCode: 'SERVER_ERROR'
    };
  }

  /**
   * Utility method to delay execution
   * 
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new APIClient();
