import { IFailureTrackingService, FailureRecord } from '../types/failure.types';
import { IConfigurationService } from '../types/config.types';

/**
 * In-memory implementation of failure tracking service for development
 * Uses Map-based storage that is lost on server restart
 */
export class FailureTrackingService implements IFailureTrackingService {
  private failureRecords: Map<string, FailureRecord>;
  private configService: IConfigurationService;

  constructor(configService: IConfigurationService) {
    this.failureRecords = new Map();
    this.configService = configService;
  }

  /**
   * Record a failed attempt for a user
   * Increments the failure count and updates timestamp
   * 
   * Requirement 8.1: Increment failure count on failed recognition
   */
  async recordFailure(userId: string): Promise<void> {
    try {
      const maxAttempts = await this.configService.getMaxFailureAttempts();
      
      // If maxAttempts is 0 or less, don't track failures (unlimited attempts)
      if (maxAttempts < 1) {
        return;
      }

      const record = this.failureRecords.get(userId);

      if (record) {
        // Increment existing failure count
        record.failureCount += 1;
        record.lastFailureTimestamp = Date.now();
        record.isLocked = record.failureCount >= maxAttempts;
        this.failureRecords.set(userId, record);
      } else {
        // Create new failure record
        const newRecord: FailureRecord = {
          userId,
          failureCount: 1,
          lastFailureTimestamp: Date.now(),
          isLocked: 1 >= maxAttempts
        };
        this.failureRecords.set(userId, newRecord);
      }
    } catch (error) {
      console.error('[FailureTracking] Error recording failure:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Re-throw to let caller handle
      throw new Error('Failed to record failure attempt');
    }
  }

  /**
   * Reset failure count on success
   * Removes the failure record for the user
   * 
   * Requirement 8.4: Reset failure count on successful recognition
   */
  async resetFailures(userId: string): Promise<void> {
    try {
      this.failureRecords.delete(userId);
    } catch (error) {
      console.error('[FailureTracking] Error resetting failures:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Don't throw - this is not critical
    }
  }

  /**
   * Check if user has exceeded max attempts
   * Returns true if user is locked out
   * 
   * Requirement 8.2: Reject requests when failure count reaches limit
   */
  async isUserLocked(userId: string): Promise<boolean> {
    try {
      const maxAttempts = await this.configService.getMaxFailureAttempts();
      
      // If maxAttempts is 0 or less, never lock users (unlimited attempts)
      if (maxAttempts < 1) {
        return false;
      }

      const record = this.failureRecords.get(userId);
      if (!record) {
        return false;
      }
      return record.isLocked;
    } catch (error) {
      console.error('[FailureTracking] Error checking lock status:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Return false to allow attempt on error (fail open)
      return false;
    }
  }

  /**
   * Get remaining attempts for a user
   * Returns the number of attempts remaining before lockout
   * Returns 99 when maxAttempts is 0 (unlimited attempts)
   */
  async getRemainingAttempts(userId: string): Promise<number> {
    try {
      const maxAttempts = await this.configService.getMaxFailureAttempts();
      
      // If maxAttempts is 0 or less, return 99 to indicate unlimited attempts
      if (maxAttempts < 1) {
        return 99;
      }

      const record = this.failureRecords.get(userId);
      
      if (!record) {
        return maxAttempts;
      }
      
      return Math.max(0, maxAttempts - record.failureCount);
    } catch (error) {
      console.error('[FailureTracking] Error getting remaining attempts:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Return 0 on error to be safe
      return 0;
    }
  }

  /**
   * Get failure record for a user (for testing purposes)
   * @internal
   */
  getFailureRecord(userId: string): FailureRecord | undefined {
    return this.failureRecords.get(userId);
  }

  /**
   * Clear all failure records (for testing purposes)
   * @internal
   */
  clearAllRecords(): void {
    this.failureRecords.clear();
  }
}
