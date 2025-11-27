import { IRecognitionService, RecognitionResult } from '../types/recognition.types';
import http from 'http';
import https from 'https';
import { debugLog, infoLog, warnLog, errorLog } from '../utils/logger';

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
   * Send recognition request to Face API
   * 
   * @param imageData Base64 encoded image data (with data URI prefix)
   * @param userId User identifier
   * @param threshold Recognition confidence threshold (0-100)
   * @param forceFailure If true, uses mock implementation
   * @param faceApiUrl Face API URL
   * @param faceApiKey Face API key
   * @returns Recognition result with userId included
   * @throws Error if recognition API fails or times out
   * 
   * Requirement 5.4: Handle Recognition API failures and timeouts
   */
  async recognize(
    imageData: string, 
    userId: string, 
    threshold: number = 70, 
    useMock: boolean = false,
    faceApiUrl?: string,
    faceApiKey?: string
  ): Promise<RecognitionResult> {
    try {
      // Use mock if useMock is true or if Face API credentials are missing
      if (useMock || !faceApiUrl || !faceApiKey) {
        debugLog('[RecognitionService] Using mock recognition', {
          useMock,
          hasFaceApiUrl: !!faceApiUrl,
          hasFaceApiKey: !!faceApiKey
        });
        const result = await this.withTimeout(
          this.mockRecognize(imageData, userId, threshold),
          this.timeout,
          'Recognition API request timed out'
        );
        return result;
      }

      // Use real Face API
      debugLog('[RecognitionService] Using Face API', '');
      const result = await this.withTimeout(
        this.callFaceAPI(imageData, userId, threshold, faceApiUrl, faceApiKey),
        this.timeout,
        'Recognition API request timed out'
      );
      
      return result;
    } catch (error) {
      // Re-throw Face API errors as-is (includes spoof, boundary, multiple faces, etc.)
      if (error instanceof Error && (error as any).code === 'FACE_API_ERROR') {
        errorLog('[RecognitionService] Re-throwing Face API error');
        throw error;
      }

      // Log the error for debugging
      errorLog('[RecognitionService] Recognition failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorCode: error instanceof Error ? (error as any).code : 'Unknown',
        timestamp: new Date().toISOString()
      });
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          throw new Error('Recognition service timed out. Please try again.');
        }
        if (error.message.includes('network') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
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
   * Call Face API for facial recognition
   * 
   * @param imageData Base64 encoded image data with data URI prefix
   * @param userId User identifier
   * @param threshold Recognition threshold (0-100)
   * @param faceApiUrl Face API base URL
   * @param faceApiKey Face API key for authentication
   * @returns Recognition result
   * @throws Error if API call fails
   */
  private async callFaceAPI(
    imageData: string,
    userId: string,
    threshold: number,
    faceApiUrl: string,
    faceApiKey: string
  ): Promise<RecognitionResult> {
    // Validate image data format
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data format');
    }

    if (!imageData.startsWith('data:image/')) {
      throw new Error('Image data must be a valid data URI');
    }

    // Extract base64 data (remove data URI prefix)
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 image data');
    }

    // Construct API URL
    const apiUrl = `${faceApiUrl}/api/v1/extract`;

    debugLog('[RecognitionService] Calling Face API:', {
      userId,
      apiUrl,
      threshold,
      timestamp: new Date().toISOString()
    });

    try {
      // Call Face API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': faceApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          biometric_data: {
            data: base64Data,
            modality: 'face',
            datatype: 'jpeg'
          },
          purpose: 'verify',
          suppress_liveness: false,
          get_quality: []
        })
      });

      // Parse response
      const responseData = await response.json() as any;

      debugLog('[RecognitionService] Face API response:', {
        userId,
        status: response.status,
        errorCode: responseData.error_code,
        timestamp: new Date().toISOString()
      });

      // Check for Face API errors
      if (responseData.error_code !== 0) {
        const errorCode = responseData.error_code;
        const errorMessage = responseData.error_message || 'Unknown error';
        
        errorLog(`[RecognitionService] Face API error for user: ${userId}`, {
          errorCode,
          errorMessage,
          errorCodeType: typeof errorCode,
          timestamp: new Date().toISOString()
        });
        
        // Create error with Face API details
        const apiError = new Error(errorMessage);
        (apiError as any).code = 'FACE_API_ERROR';
        (apiError as any).faceApiErrorCode = errorCode;
        (apiError as any).faceApiErrorMessage = errorMessage;
        
        errorLog('[RecognitionService] Throwing Face API error:', {
          code: (apiError as any).code,
          faceApiErrorCode: (apiError as any).faceApiErrorCode,
          faceApiErrorMessage: (apiError as any).faceApiErrorMessage
        });
        
        throw apiError;
      }

      // Check if extract response is successful
      if (response.ok && responseData.error_code === 0 && responseData.extracted_data?.liveness) {
        const spoofProbability = responseData.extracted_data.liveness.spoof_probability as number;
        const spoofScore = spoofProbability * 100;
        
        // Check liveness: spoof_probability * 100 < threshold
        if (spoofScore >= threshold) {
          // Failed liveness check
          const confidence = Math.round((1 - spoofProbability) * 100);
          debugLog('[RecognitionService] Failed liveness check:', {
            userId,
            spoofScore,
            threshold,
            confidence,
            timestamp: new Date().toISOString()
          });

          return {
            recognized: false,
            confidence,
            userId
          };
        }

        // Passed liveness check - proceed to identify
        const template = responseData.extracted_data.biometric_data?.data;
        if (!template) {
          warnLog('[RecognitionService] No template in extract response');
          return {
            recognized: false,
            confidence: 0,
            userId
          };
        }

        // Call identify API
        const identifyUrl = `${faceApiUrl}/api/v1/users/identify`;
        debugLog('[RecognitionService] Calling identify API:', {
          userId,
          identifyUrl,
          timestamp: new Date().toISOString()
        });

        const identifyResponse = await fetch(identifyUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': faceApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            biometric_data: {
              modality: 'face',
              datatype: 'hftemplate',
              data: template
            },
            identification_policy: 'exhaustive'
          })
        });

        const identifyData = await identifyResponse.json() as any;

        debugLog('[RecognitionService] Identify API response:', {
          userId,
          status: identifyResponse.status,
          errorCode: identifyData.error_code,
          timestamp: new Date().toISOString()
        });

        // Check identify response
        if (identifyResponse.ok && identifyData.error_code === 0 && identifyData.identified_users?.length > 0) {
          debugLog('[RecognitionService] Checking all identified users:', {
            userId,
            totalIdentified: identifyData.identified_users.length,
            timestamp: new Date().toISOString()
          });

          // Iterate through all identified users to find a match
          for (const identifiedUser of identifyData.identified_users) {
            const externalId = identifiedUser.user?.external_id;
            const matchConfidence = identifiedUser.match_confidence as number;
            const confidenceScore = Math.round(matchConfidence * 100);

            debugLog('[RecognitionService] Checking identified user:', {
              userId,
              externalId,
              matchConfidence,
              confidenceScore,
              threshold,
              timestamp: new Date().toISOString()
            });

            // Check if external_id matches userId and confidence meets threshold
            if (externalId === userId && confidenceScore >= threshold) {
              debugLog('[RecognitionService] Match found:', {
                userId,
                externalId,
                confidenceScore,
                timestamp: new Date().toISOString()
              });

              return {
                recognized: true,
                confidence: confidenceScore,
                userId
              };
            }
          }

          // No matching user found in the identified_users array
          debugLog('[RecognitionService] No matching user found:', {
            userId,
            totalChecked: identifyData.identified_users.length,
            timestamp: new Date().toISOString()
          });

          return {
            recognized: false,
            confidence: 0,
            userId
          };
        } else {
          // Identify API error or no users found
          warnLog('[RecognitionService] Identify API error or no users found:');
          debugLog('[RecognitionService] Identify API error details:', {
            userId,
            status: identifyResponse.status,
            errorCode: identifyData.error_code,
            timestamp: new Date().toISOString()
          });

          return {
            recognized: false,
            confidence: 0,
            userId
          };
        }
      } else {
        // API returned error or invalid response - treat as failure with 0 confidence
        warnLog('[RecognitionService] Face API returned error or invalid response');
        debugLog('[RecognitionService] Face API error details:', {
          userId,
          status: response.status,
          errorCode: responseData.error_code,
          errorMessage: responseData.error_message,
          timestamp: new Date().toISOString()
        });

        return {
          recognized: false,
          confidence: 0,
          userId
        };
      }
    } catch (error) {
      // Re-throw Face API errors (includes spoof, boundary, multiple faces, etc.)
      if (error instanceof Error && (error as any).code === 'FACE_API_ERROR') {
        errorLog('[RecognitionService] Re-throwing Face API error from callFaceAPI');
        throw error;
      }

      errorLog('[RecognitionService] Face API call failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof Error ? (error as any).code : 'Unknown',
        timestamp: new Date().toISOString()
      });

      // Return failure with 0 confidence for any other API errors
      return {
        recognized: false,
        confidence: 0,
        userId
      };
    }
  }

  /**
   * Mock recognition implementation for development
   * Returns random success/failure with confidence score
   * 
   * @param imageData Base64 encoded image data (unused in mock)
   * @param userId User identifier to include in result
   * @param threshold Recognition threshold (0-100)
   * @returns Mock recognition result
   * @throws Error if image data is invalid
   */
  private async mockRecognize(imageData: string, userId: string, threshold: number = 70): Promise<RecognitionResult> {
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
    const confidence = Math.floor(Math.random() * 101);
    
    // Determine if recognized based on threshold
    const recognized = confidence >= threshold;

    debugLog('[RecognitionService] Mock recognition completed:', {
      userId,
      recognized,
      confidence,
      threshold,
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
