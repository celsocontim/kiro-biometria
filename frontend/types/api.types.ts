/**
 * API-related type definitions for frontend
 * Matches backend API contract
 */

/**
 * Request body for POST /api/capture endpoint
 */
export interface CaptureRequest {
  /** Base64 encoded image data */
  imageData: string;
  
  /** User identifier */
  userId: string;
  
  /** Optional capture timestamp */
  timestamp?: number;
}

/**
 * Response from POST /api/capture endpoint
 */
export interface CaptureResponse {
  /** Whether the request was successful */
  success: boolean;
  
  /** Response data (present on success) */
  data?: {
    /** Whether the face was recognized */
    recognized: boolean;
    
    /** Confidence score between 0 and 1 */
    confidence: number;
    
    /** User identifier echoed back */
    userId: string;
    
    /** ISO 8601 timestamp */
    timestamp: string;
    
    /** Number of attempts remaining before lockout */
    attemptsRemaining?: number;
  };
  
  /** Error message (present on failure) */
  error?: string;
  
  /** Error code for client handling */
  errorCode?: 'MAX_ATTEMPTS_EXCEEDED' | 'INVALID_REQUEST' | 'SERVER_ERROR' | 'LIVENESS_CHECK_ERROR';
}
