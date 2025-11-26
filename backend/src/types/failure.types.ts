/**
 * Failure tracking record for a user
 */
export interface FailureRecord {
  userId: string;
  failureCount: number;
  lastFailureTimestamp: number;
  isLocked: boolean;
}

/**
 * Interface for failure tracking service
 */
export interface IFailureTrackingService {
  /**
   * Record a failed attempt for a user
   * @param userId User identifier
   */
  recordFailure(userId: string): Promise<void>;
  
  /**
   * Reset failure count on success
   * @param userId User identifier
   */
  resetFailures(userId: string): Promise<void>;
  
  /**
   * Check if user has exceeded max attempts
   * @param userId User identifier
   * @returns True if user is locked out
   */
  isUserLocked(userId: string): Promise<boolean>;
  
  /**
   * Get remaining attempts for a user
   * @param userId User identifier
   * @returns Number of remaining attempts
   */
  getRemainingAttempts(userId: string): Promise<number>;
}
