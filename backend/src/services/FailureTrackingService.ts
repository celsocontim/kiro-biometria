import { IFailureTrackingService, FailureRecord } from '../types/failure.types';
import { IConfigurationService } from '../types/config.types';

/**
 * In-memory implementation of failure tracking service for development
 * Uses Map-based storage that is lost on server restart
 * Includes automatic cleanup of expired records based on TTL
 */
export class FailureTrackingService implements IFailureTrackingService {
  private failureRecords: Map<string, FailureRecord>;
  private configService: IConfigurationService;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(configService: IConfigurationService) {
    this.failureRecords = new Map();
    this.configService = configService;
    this.startAutoCleanup();
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

  /**
   * Start automatic cleanup of expired failure records
   * Runs every hour and removes records older than FAILURE_RECORD_TTL
   */
  private startAutoCleanup(): void {
    // Run cleanup every hour
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredRecords();
    }, 3600000); // 1 hour in milliseconds

    console.log('[FailureTracking] Auto-cleanup started (runs every 1 hour)');
  }

  /**
   * Stop automatic cleanup (for testing or shutdown)
   */
  stopAutoCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('[FailureTracking] Auto-cleanup stopped');
    }
  }

  /**
   * Clean up expired failure records based on TTL
   * Records older than FAILURE_RECORD_TTL minutes are removed
   */
  private cleanupExpiredRecords(): void {
    try {
      // Get TTL from environment variable (in minutes, default 2 minutes)
      const ttlMinutes = parseInt(process.env.FAILURE_RECORD_TTL || '2', 10);
      const ttlMs = ttlMinutes * 60 * 1000; // Convert to milliseconds
      const now = Date.now();
      let cleanedCount = 0;

      console.log('[FailureTracking] Running cleanup:', {
        ttlMinutes,
        totalRecords: this.failureRecords.size,
        timestamp: new Date().toISOString()
      });

      // Iterate through all records and remove expired ones
      for (const [userId, record] of this.failureRecords.entries()) {
        const age = now - record.lastFailureTimestamp;
        
        if (age > ttlMs) {
          this.failureRecords.delete(userId);
          cleanedCount++;
          
          console.log('[FailureTracking] Cleaned expired record:', {
            userId,
            ageMinutes: Math.round(age / 60000),
            ttlMinutes,
            timestamp: new Date().toISOString()
          });
        }
      }

      if (cleanedCount > 0) {
        console.log('[FailureTracking] Cleanup completed:', {
          cleanedCount,
          remainingRecords: this.failureRecords.size,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[FailureTracking] Error during cleanup:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Manually trigger cleanup (for testing purposes)
   * @internal
   */
  triggerCleanup(): void {
    this.cleanupExpiredRecords();
  }

  /**
   * Get minutes remaining until failure record expires
   * Returns the number of minutes until the user can try again
   * Returns 0 if no record exists or record has expired
   */
  async getMinutesUntilExpiry(userId: string): Promise<number> {
    try {
      const record = this.failureRecords.get(userId);
      
      if (!record) {
        return 0;
      }

      // Get TTL from environment variable (in minutes, default 2 minutes)
      const ttlMinutes = parseInt(process.env.FAILURE_RECORD_TTL || '2', 10);
      const ttlMs = ttlMinutes * 60 * 1000;
      const now = Date.now();
      const age = now - record.lastFailureTimestamp;
      const remainingMs = ttlMs - age;

      if (remainingMs <= 0) {
        return 0;
      }

      // Convert to minutes and round up
      return Math.ceil(remainingMs / 60000);
    } catch (error) {
      console.error('[FailureTracking] Error getting minutes until expiry:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return 0;
    }
  }
}
