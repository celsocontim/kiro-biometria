import * as fc from 'fast-check';
import { FailureTrackingService } from '../FailureTrackingService';
import { ConfigurationService } from '../ConfigurationService';

describe('FailureTrackingService', () => {
  let configService: ConfigurationService;
  let failureService: FailureTrackingService;

  beforeEach(() => {
    // Create fresh instances for each test
    configService = new ConfigurationService();
    failureService = new FailureTrackingService(configService);
  });

  describe('Basic functionality', () => {
    it('should initialize with no failure records', async () => {
      const isLocked = await failureService.isUserLocked('test-user');
      expect(isLocked).toBe(false);
    });

    it('should return max attempts for new user', async () => {
      const remaining = await failureService.getRemainingAttempts('test-user');
      const maxAttempts = await configService.getMaxFailureAttempts();
      expect(remaining).toBe(maxAttempts);
    });

    it('should record a failure', async () => {
      await failureService.recordFailure('test-user');
      const remaining = await failureService.getRemainingAttempts('test-user');
      const maxAttempts = await configService.getMaxFailureAttempts();
      expect(remaining).toBe(maxAttempts - 1);
    });

    it('should reset failures', async () => {
      await failureService.recordFailure('test-user');
      await failureService.resetFailures('test-user');
      const remaining = await failureService.getRemainingAttempts('test-user');
      const maxAttempts = await configService.getMaxFailureAttempts();
      expect(remaining).toBe(maxAttempts);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 15: Failure count increments on failed recognition
     * 
     * Property: For any failed recognition attempt, the Backend Service should increment
     * the failure count for that User Identifier.
     * 
     * Validates: Requirements 8.1
     */
    it('should increment failure count on each failed recognition', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user identifiers
          fc.string({ minLength: 1, maxLength: 255 }),
          // Generate random number of failures (1 to 20)
          fc.integer({ min: 1, max: 20 }),
          async (userId, numFailures) => {
            // Clear any existing records
            failureService.clearAllRecords();
            
            // Get max attempts
            const maxAttempts = await configService.getMaxFailureAttempts();
            const initialRemaining = await failureService.getRemainingAttempts(userId);
            
            // Record failures one by one
            for (let i = 0; i < numFailures; i++) {
              await failureService.recordFailure(userId);
            }
            
            // Get remaining attempts after failures
            const finalRemaining = await failureService.getRemainingAttempts(userId);
            
            // Property: Each failure should decrement remaining attempts by 1
            // (until we hit 0, then it stays at 0)
            const expectedRemaining = Math.max(0, initialRemaining - numFailures);
            expect(finalRemaining).toBe(expectedRemaining);
            
            // Property: Failure count should equal number of failures recorded
            // (up to the max, after which user is locked)
            const record = failureService.getFailureRecord(userId);
            expect(record).toBeDefined();
            expect(record!.failureCount).toBe(numFailures);
            
            // Property: If failures >= maxAttempts, remaining should be 0
            if (numFailures >= maxAttempts) {
              expect(finalRemaining).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 16: User locked after max failures
     * 
     * Property: For any User Identifier that has reached the configured failure limit,
     * the Backend Service should reject further capture requests with a 403 status.
     * 
     * Validates: Requirements 8.2
     */
    it('should lock user after reaching max failure attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user identifiers
          fc.string({ minLength: 1, maxLength: 255 }),
          // Generate random max attempts (1 to 10)
          fc.integer({ min: 1, max: 10 }),
          async (userId, maxAttempts) => {
            // Clear any existing records
            failureService.clearAllRecords();
            
            // Create a config service with custom max attempts
            const customConfigService = new ConfigurationService();
            // Set environment variable temporarily
            const originalEnv = process.env.MAX_FAILURE_ATTEMPTS;
            process.env.MAX_FAILURE_ATTEMPTS = maxAttempts.toString();
            
            // Create new service with custom config
            const customConfigService2 = new ConfigurationService();
            const customFailureService = new FailureTrackingService(customConfigService2);
            
            try {
              // Property: User should NOT be locked before reaching max attempts
              for (let i = 0; i < maxAttempts - 1; i++) {
                await customFailureService.recordFailure(userId);
                const isLocked = await customFailureService.isUserLocked(userId);
                expect(isLocked).toBe(false);
              }
              
              // Record the final failure that should trigger lockout
              await customFailureService.recordFailure(userId);
              
              // Property: User SHOULD be locked after reaching max attempts
              const isLockedAfterMax = await customFailureService.isUserLocked(userId);
              expect(isLockedAfterMax).toBe(true);
              
              // Property: Remaining attempts should be 0 when locked
              const remaining = await customFailureService.getRemainingAttempts(userId);
              expect(remaining).toBe(0);
              
              // Property: Recording additional failures should keep user locked
              await customFailureService.recordFailure(userId);
              const stillLocked = await customFailureService.isUserLocked(userId);
              expect(stillLocked).toBe(true);
              
            } finally {
              // Restore original environment
              if (originalEnv !== undefined) {
                process.env.MAX_FAILURE_ATTEMPTS = originalEnv;
              } else {
                delete process.env.MAX_FAILURE_ATTEMPTS;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 18: Failure count resets on success
     * 
     * Property: For any User Identifier that successfully completes recognition,
     * the Backend Service should reset the failure count to zero.
     * 
     * Validates: Requirements 8.4
     */
    it('should reset failure count on successful recognition', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user identifiers
          fc.string({ minLength: 1, maxLength: 255 }),
          // Generate random number of failures before success (1 to 10)
          fc.integer({ min: 1, max: 10 }),
          async (userId, numFailuresBeforeSuccess) => {
            // Clear any existing records
            failureService.clearAllRecords();
            
            // Get max attempts
            const maxAttempts = await configService.getMaxFailureAttempts();
            
            // Ensure we don't exceed max attempts (so user isn't locked)
            const failuresToRecord = Math.min(numFailuresBeforeSuccess, maxAttempts - 1);
            
            // Record some failures
            for (let i = 0; i < failuresToRecord; i++) {
              await failureService.recordFailure(userId);
            }
            
            // Verify failures were recorded
            const remainingBeforeReset = await failureService.getRemainingAttempts(userId);
            expect(remainingBeforeReset).toBe(maxAttempts - failuresToRecord);
            
            // Reset failures (simulating successful recognition)
            await failureService.resetFailures(userId);
            
            // Property: After reset, remaining attempts should equal max attempts
            const remainingAfterReset = await failureService.getRemainingAttempts(userId);
            expect(remainingAfterReset).toBe(maxAttempts);
            
            // Property: User should not be locked after reset
            const isLocked = await failureService.isUserLocked(userId);
            expect(isLocked).toBe(false);
            
            // Property: Failure record should be removed
            const record = failureService.getFailureRecord(userId);
            expect(record).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
