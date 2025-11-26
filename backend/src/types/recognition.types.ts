/**
 * Result from facial recognition processing
 */
export interface RecognitionResult {
  /** Whether the face was recognized */
  recognized: boolean;
  
  /** Confidence score between 0 and 1 */
  confidence: number;
  
  /** User identifier echoed back */
  userId: string;
}

/**
 * Interface for recognition service
 */
export interface IRecognitionService {
  /**
   * Send recognition request
   * @param imageData Base64 encoded image data
   * @param userId User identifier
   * @returns Recognition result
   */
  recognize(imageData: string, userId: string): Promise<RecognitionResult>;
}
