/**
 * Interface for failure tracking service
 * Defines the contract that all failure tracking implementations must follow
 */
export interface IFailureTrackingService {
  /**
   * Record a failure for a user
   */
  recordFailure(userId: string): Promise<void>;
  
  /**
   * Check if a user is currently locked
   */
  isUserLocked(userId: string): Promise<boolean>;
  
  /**
   * Get remaining attempts for a user
   */
  getRemainingAttempts(userId: string): Promise<number>;
  
  /**
   * Get minutes until lockout expires
   */
  getMinutesUntilExpiry(userId: string): Promise<number>;
  
  /**
   * Reset failures for a user
   */
  resetFailures(userId: string): Promise<void>;
}
