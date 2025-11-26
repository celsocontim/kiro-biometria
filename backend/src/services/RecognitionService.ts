import { IRecognitionService, RecognitionResult } from '../types/recognition.types';
import http from 'http';
import https from 'https';

/**
 * Recognition service that communicates with external recognition API
 * Currently uses mock implementation for development
 * 
 * Requirements: 5.1, 5.2, 5.4
 * Performance: Connection pooling for API calls
 */
export class RecognitionService implements IRecognitionService {
  private readonly timeout: number = 10000; // 10 second timeout for API calls
  
  // HTTP/HTTPS agents with connection pooling for performance
  // These agents reuse TCP connections to reduce latency
  private readonly httpAgent: http.Agent;
  private readonly httpsAgent: https.Agent;

  constructor() {
    // Configure HTTP agent with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000, // Keep connections alive for 30 seconds
      maxSockets: 50, // Maximum concurrent connections
      maxFreeSockets: 10, // Maximum idle connections to keep open
      timeout: 10000, // Socket timeout
    });

    // Configure HTTPS agent with connection pooling
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 10000,
    });
  }

  /**
   * Send recognition request to external API
   * Currently uses mock implementation that returns random success/failure
   * 
   * @param imageData Base64 encoded image data
   * @param userId User identifier
   * @param threshold Recognition confidence threshold (0-100)
   * @param forceFailure If true, generates confidence below threshold
   * @returns Recognition result with userId included
   * @throws Error if recognition API fails or times out
   * 
   * Requirement 5.4: Handle Recognition API failures and timeouts
   */
  async recognize(imageData: string, userId: string, threshold: number = 70, forceFailure: boolean = false): Promise<RecognitionResult> {
    try {
      // TODO: Replace with actual API integration when available
      // For now, use mock implementation
      
      // Add timeout wrapper for future API calls
      const result = await this.withTimeout(
        this.mockRecognize(imageData, userId, threshold, forceFailure),
        this.timeout,
        'Recognition API request timed out'
      );
      
      return result;
    } catch (error) {
      // Log the error for debugging
      console.error('[RecognitionService] Recognition failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString()
      });
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          throw new Error('Recognition service timed out. Please try again.');
        }
        if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
          throw new Error('Unable to connect to recognition service. Please try again later.');
        }
      }
      
      // Re-throw with user-friendly message
      throw new Error('Recognition service temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Wrap a promise with a timeout
   * @param promise Promise to wrap
   * @param timeoutMs Timeout in milliseconds
   * @param errorMessage Error message if timeout occurs
   * @returns Promise that rejects if timeout occurs
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * Mock recognition implementation for development
   * Returns random success/failure with confidence score
   * 
   * @param imageData Base64 encoded image data (unused in mock)
   * @param userId User identifier to include in result
   * @param threshold Recognition threshold (0-100)
   * @param forceFailure If true, generates confidence below threshold
   * @returns Mock recognition result
   * @throws Error if image data is invalid
   */
  private async mockRecognize(imageData: string, userId: string, threshold: number = 70, forceFailure: boolean = false): Promise<RecognitionResult> {
    // Validate image data format (basic check)
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data format');
    }

    if (!imageData.startsWith('data:image/')) {
      throw new Error('Image data must be a valid data URI');
    }

    // Simulate API processing delay
    await this.delay(500 + Math.random() * 1000);

    // Generate random confidence score (0-100)
    let confidence: number;
    
    if (forceFailure) {
      // Force failure: generate confidence below threshold (0 to threshold-1)
      confidence = threshold > 0 ? Math.floor(Math.random() * threshold) : 0;
    } else {
      // Normal operation: random confidence 0-100
      confidence = Math.floor(Math.random() * 101);
    }
    
    // Determine if recognized based on threshold
    const recognized = confidence >= threshold;

    console.log('[RecognitionService] Mock recognition completed:', {
      userId,
      recognized,
      confidence,
      threshold,
      forceFailure,
      timestamp: new Date().toISOString()
    });

    return {
      recognized,
      confidence,
      userId
    };
  }

  /**
   * Utility method to simulate async delay
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the appropriate HTTP agent based on URL protocol
   * @param url URL to determine protocol
   * @returns HTTP or HTTPS agent with connection pooling
   */
  private getAgent(url: string): http.Agent | https.Agent {
    return url.startsWith('https') ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Cleanup method to destroy agents when service is no longer needed
   * Should be called when shutting down the application
   */
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  /**
   * Placeholder for future real API integration
   * 
   * Example implementation using native fetch with connection pooling:
   * ```typescript
   * private async callRealAPI(imageData: string, userId: string): Promise<RecognitionResult> {
   *   const apiUrl = process.env.RECOGNITION_API_URL || '';
   *   
   *   // Note: When using fetch in Node.js 18+, you can pass the agent via dispatcher
   *   // For older versions or more control, consider using 'node-fetch' or 'axios'
   *   const response = await fetch(apiUrl, {
   *     method: 'POST',
   *     headers: {
   *       'Authorization': `Bearer ${process.env.RECOGNITION_API_KEY}`,
   *       'Content-Type': 'application/json'
   *     },
   *     body: JSON.stringify({
   *       image: imageData,
   *       userId: userId
   *     }),
   *     // For Node.js with undici (default in Node 18+):
   *     // @ts-ignore - dispatcher is available but not in types
   *     dispatcher: this.getAgent(apiUrl)
   *   });
   *   
   *   if (!response.ok) {
   *     throw new Error(`Recognition API returned ${response.status}`);
   *   }
   *   
   *   const data = await response.json();
   *   
   *   return {
   *     recognized: data.recognized,
   *     confidence: data.confidence,
   *     userId: userId
   *   };
   * }
   * ```
   * 
   * Alternative with axios (requires: npm install axios):
   * ```typescript
   * import axios from 'axios';
   * 
   * private async callRealAPI(imageData: string, userId: string): Promise<RecognitionResult> {
   *   const response = await axios.post(
   *     process.env.RECOGNITION_API_URL || '',
   *     {
   *       image: imageData,
   *       userId: userId
   *     },
   *     {
   *       headers: {
   *         'Authorization': `Bearer ${process.env.RECOGNITION_API_KEY}`,
   *         'Content-Type': 'application/json'
   *       },
   *       timeout: this.timeout,
   *       httpAgent: this.httpAgent,  // Use connection pooling agent
   *       httpsAgent: this.httpsAgent  // Use connection pooling agent
   *     }
   *   );
   *   
   *   return {
   *     recognized: response.data.recognized,
   *     confidence: response.data.confidence,
   *     userId: userId
   *   };
   * }
   * ```
   */
}
