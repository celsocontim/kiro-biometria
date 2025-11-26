import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationService } from '../ConfigurationService';

describe('ConfigurationService', () => {
  const testConfigDir = path.join(__dirname, 'test-configs');
  
  beforeAll(() => {
    // Create test config directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test config directory
    if (fs.existsSync(testConfigDir)) {
      const files = fs.readdirSync(testConfigDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testConfigDir, file));
      });
      fs.rmdirSync(testConfigDir);
    }
  });

  describe('Basic functionality', () => {
    it('should load default configuration', async () => {
      const service = new ConfigurationService();
      const config = await service.getConfiguration();
      
      expect(config).toBeDefined();
      expect(config.maxFailureAttempts).toBe(5);
      expect(config.failureResetOnSuccess).toBe(true);
      expect(config.captureTimeout).toBe(30000);
    });

    it('should get max failure attempts', async () => {
      const service = new ConfigurationService();
      const maxAttempts = await service.getMaxFailureAttempts();
      
      expect(typeof maxAttempts).toBe('number');
      expect(maxAttempts).toBeGreaterThan(0);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 17: Configuration loaded without deployment
     * 
     * Property: For any configuration change to the max failure attempts limit,
     * the Backend Service should apply the new value to subsequent requests
     * without requiring restart or redeployment.
     * 
     * Validates: Requirements 8.3, 8.5
     */
    it('should reload configuration from file without restart', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random valid configuration values
          fc.integer({ min: 1, max: 100 }), // maxFailureAttempts
          fc.boolean(), // failureResetOnSuccess
          fc.integer({ min: 1000, max: 120000 }), // captureTimeout
          async (maxFailureAttempts, failureResetOnSuccess, captureTimeout) => {
            // Create a unique config file for this test iteration
            const configFilePath = path.join(testConfigDir, `config-${Date.now()}-${Math.random()}.json`);
            
            try {
              // Write initial configuration
              const initialConfig = {
                maxFailureAttempts: 5,
                failureResetOnSuccess: true,
                captureTimeout: 30000
              };
              fs.writeFileSync(configFilePath, JSON.stringify(initialConfig, null, 2));
              
              // Create service with config file
              const service = new ConfigurationService(configFilePath);
              
              // Verify initial configuration
              const config1 = await service.getConfiguration();
              expect(config1.maxFailureAttempts).toBe(5);
              expect(config1.failureResetOnSuccess).toBe(true);
              expect(config1.captureTimeout).toBe(30000);
              
              // Update configuration file (simulating external change)
              const updatedConfig = {
                maxFailureAttempts,
                failureResetOnSuccess,
                captureTimeout
              };
              fs.writeFileSync(configFilePath, JSON.stringify(updatedConfig, null, 2));
              
              // Reload configuration (without restart)
              await service.reloadConfiguration();
              
              // Verify configuration was reloaded
              const config2 = await service.getConfiguration();
              expect(config2.maxFailureAttempts).toBe(maxFailureAttempts);
              expect(config2.failureResetOnSuccess).toBe(failureResetOnSuccess);
              expect(config2.captureTimeout).toBe(captureTimeout);
              
              // Verify subsequent requests use new configuration
              const maxAttempts = await service.getMaxFailureAttempts();
              expect(maxAttempts).toBe(maxFailureAttempts);
              
            } finally {
              // Clean up config file
              if (fs.existsSync(configFilePath)) {
                fs.unlinkSync(configFilePath);
              }
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Additional property test: Configuration reload should handle invalid values gracefully
     */
    it('should handle invalid configuration values gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(-1), // negative number
            fc.constant(0), // zero
            fc.constant(null), // null
            fc.constant(undefined), // undefined
            fc.constant('invalid'), // string instead of number
          ),
          async (invalidValue) => {
            const configFilePath = path.join(testConfigDir, `config-invalid-${Date.now()}.json`);
            
            try {
              // Write initial valid configuration
              const initialConfig = {
                maxFailureAttempts: 5,
                failureResetOnSuccess: true,
                captureTimeout: 30000
              };
              fs.writeFileSync(configFilePath, JSON.stringify(initialConfig, null, 2));
              
              const service = new ConfigurationService(configFilePath);
              
              // Get initial valid config
              const config1 = await service.getConfiguration();
              expect(config1.maxFailureAttempts).toBe(5);
              
              // Write invalid configuration
              const invalidConfig = {
                maxFailureAttempts: invalidValue,
                failureResetOnSuccess: true,
                captureTimeout: 30000
              };
              fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig, null, 2));
              
              // Reload configuration
              await service.reloadConfiguration();
              
              // Should fall back to previous valid value or default
              const config2 = await service.getConfiguration();
              expect(config2.maxFailureAttempts).toBeGreaterThan(0);
              expect(typeof config2.maxFailureAttempts).toBe('number');
              
            } finally {
              if (fs.existsSync(configFilePath)) {
                fs.unlinkSync(configFilePath);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property test: Auto-reload should apply configuration changes periodically
     */
    it('should auto-reload configuration at specified intervals', async () => {
      const configFilePath = path.join(testConfigDir, `config-autoreload-${Date.now()}.json`);
      
      try {
        // Write initial configuration
        const initialConfig = {
          maxFailureAttempts: 5,
          failureResetOnSuccess: true,
          captureTimeout: 30000
        };
        fs.writeFileSync(configFilePath, JSON.stringify(initialConfig, null, 2));
        
        const service = new ConfigurationService(configFilePath);
        
        // Start auto-reload with short interval for testing (100ms)
        service.startAutoReload(100);
        
        // Verify initial configuration
        const config1 = await service.getConfiguration();
        expect(config1.maxFailureAttempts).toBe(5);
        
        // Update configuration file
        const updatedConfig = {
          maxFailureAttempts: 10,
          failureResetOnSuccess: false,
          captureTimeout: 60000
        };
        fs.writeFileSync(configFilePath, JSON.stringify(updatedConfig, null, 2));
        
        // Wait for auto-reload to trigger (150ms to ensure it runs)
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Verify configuration was auto-reloaded
        const config2 = await service.getConfiguration();
        expect(config2.maxFailureAttempts).toBe(10);
        expect(config2.failureResetOnSuccess).toBe(false);
        expect(config2.captureTimeout).toBe(60000);
        
        // Stop auto-reload
        service.stopAutoReload();
        
      } finally {
        if (fs.existsSync(configFilePath)) {
          fs.unlinkSync(configFilePath);
        }
      }
    });
  });

  describe('Environment variable loading', () => {
    it('should load configuration from environment variables', async () => {
      // Set environment variables
      const originalEnv = { ...process.env };
      process.env.MAX_FAILURE_ATTEMPTS = '10';
      process.env.FAILURE_RESET_ON_SUCCESS = 'false';
      process.env.CAPTURE_TIMEOUT = '45000';
      
      try {
        const service = new ConfigurationService();
        const config = await service.getConfiguration();
        
        expect(config.maxFailureAttempts).toBe(10);
        expect(config.failureResetOnSuccess).toBe(false);
        expect(config.captureTimeout).toBe(45000);
      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    });
  });
});
