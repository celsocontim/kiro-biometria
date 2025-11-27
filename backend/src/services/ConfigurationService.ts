import { AppConfiguration, IConfigurationService } from '../types/config.types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AppConfiguration = {
  maxFailureAttempts: 5,
  failureResetOnSuccess: true,
  captureTimeout: 30000,
  recognitionApiUrl: process.env.RECOGNITION_API_URL || '',
  recognitionApiKey: process.env.RECOGNITION_API_KEY || '',
  recognitionThreshold: 70, // Default 70% confidence threshold
  useMock: false, // Default to real Face API
  faceApiUrl: process.env.FACE_API_URL || '',
  faceApiKey: process.env.FACE_API_KEY || ''
};

/**
 * Configuration service that loads configuration from environment variables
 * and supports runtime reloading without deployment
 */
export class ConfigurationService implements IConfigurationService {
  private config: AppConfiguration;
  private reloadIntervalId: NodeJS.Timeout | null = null;
  private configFilePath: string | null = null;

  constructor(configFilePath?: string) {
    this.configFilePath = configFilePath || null;
    this.config = this.loadConfigurationSync();
  }

  /**
   * Synchronously load configuration from environment variables or file
   * 
   * Requirements: 8.3, 8.5 - Load configuration without deployment
   */
  private loadConfigurationSync(): AppConfiguration {
    const config: AppConfiguration = { ...DEFAULT_CONFIG };

    try {
      // Load from environment variables
      if (process.env.MAX_FAILURE_ATTEMPTS) {
        const parsed = parseInt(process.env.MAX_FAILURE_ATTEMPTS, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          config.maxFailureAttempts = parsed;
          console.log('[Config] Loaded MAX_FAILURE_ATTEMPTS from env:', parsed);
        } else {
          console.warn('[Config] Invalid MAX_FAILURE_ATTEMPTS value, using default:', DEFAULT_CONFIG.maxFailureAttempts);
        }
      }

      if (process.env.FAILURE_RESET_ON_SUCCESS !== undefined) {
        config.failureResetOnSuccess = process.env.FAILURE_RESET_ON_SUCCESS === 'true';
        console.log('[Config] Loaded FAILURE_RESET_ON_SUCCESS from env:', config.failureResetOnSuccess);
      }

      if (process.env.CAPTURE_TIMEOUT) {
        const parsed = parseInt(process.env.CAPTURE_TIMEOUT, 10);
        if (!isNaN(parsed) && parsed > 0) {
          config.captureTimeout = parsed;
          console.log('[Config] Loaded CAPTURE_TIMEOUT from env:', parsed);
        } else {
          console.warn('[Config] Invalid CAPTURE_TIMEOUT value, using default:', DEFAULT_CONFIG.captureTimeout);
        }
      }

      if (process.env.RECOGNITION_API_URL) {
        config.recognitionApiUrl = process.env.RECOGNITION_API_URL;
        console.log('[Config] Loaded RECOGNITION_API_URL from env');
      }

      if (process.env.RECOGNITION_API_KEY) {
        config.recognitionApiKey = process.env.RECOGNITION_API_KEY;
        console.log('[Config] Loaded RECOGNITION_API_KEY from env');
      }

      if (process.env.RECOGNITION_THRESHOLD) {
        const parsed = parseInt(process.env.RECOGNITION_THRESHOLD, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          config.recognitionThreshold = parsed;
          console.log('[Config] Loaded RECOGNITION_THRESHOLD from env:', parsed);
        } else {
          console.warn('[Config] Invalid RECOGNITION_THRESHOLD value (must be 0-100), using default:', DEFAULT_CONFIG.recognitionThreshold);
        }
      }

      if (process.env.USE_MOCK !== undefined) {
        config.useMock = process.env.USE_MOCK === 'true';
        console.log('[Config] Loaded USE_MOCK from env:', config.useMock);
      }

      if (process.env.FACE_API_URL) {
        config.faceApiUrl = process.env.FACE_API_URL;
        console.log('[Config] Loaded FACE_API_URL from env');
      }

      if (process.env.FACE_API_KEY) {
        config.faceApiKey = process.env.FACE_API_KEY;
        console.log('[Config] Loaded FACE_API_KEY from env');
      }

      // Load from file if path is provided
      if (this.configFilePath) {
        if (fs.existsSync(this.configFilePath)) {
          try {
            const fileContent = fs.readFileSync(this.configFilePath, 'utf-8');
            const fileConfig = JSON.parse(fileContent);
            
            console.log('[Config] Loading configuration from file:', this.configFilePath);
            
            // Merge file config with environment config (file takes precedence)
            if (typeof fileConfig.maxFailureAttempts === 'number' && fileConfig.maxFailureAttempts >= 0) {
              config.maxFailureAttempts = fileConfig.maxFailureAttempts;
              console.log('[Config] Loaded maxFailureAttempts from file:', fileConfig.maxFailureAttempts);
            }
            if (typeof fileConfig.failureResetOnSuccess === 'boolean') {
              config.failureResetOnSuccess = fileConfig.failureResetOnSuccess;
              console.log('[Config] Loaded failureResetOnSuccess from file:', fileConfig.failureResetOnSuccess);
            }
            if (typeof fileConfig.captureTimeout === 'number' && fileConfig.captureTimeout > 0) {
              config.captureTimeout = fileConfig.captureTimeout;
              console.log('[Config] Loaded captureTimeout from file:', fileConfig.captureTimeout);
            }
            if (typeof fileConfig.recognitionApiUrl === 'string') {
              config.recognitionApiUrl = fileConfig.recognitionApiUrl;
              console.log('[Config] Loaded recognitionApiUrl from file');
            }
            if (typeof fileConfig.recognitionApiKey === 'string') {
              config.recognitionApiKey = fileConfig.recognitionApiKey;
              console.log('[Config] Loaded recognitionApiKey from file');
            }
            if (typeof fileConfig.recognitionThreshold === 'number' && fileConfig.recognitionThreshold >= 0 && fileConfig.recognitionThreshold <= 100) {
              config.recognitionThreshold = fileConfig.recognitionThreshold;
              console.log('[Config] Loaded recognitionThreshold from file:', fileConfig.recognitionThreshold);
            }
            if (typeof fileConfig.useMock === 'boolean') {
              config.useMock = fileConfig.useMock;
              console.log('[Config] Loaded useMock from file:', fileConfig.useMock);
            }
            if (typeof fileConfig.faceApiUrl === 'string') {
              config.faceApiUrl = fileConfig.faceApiUrl;
              console.log('[Config] Loaded faceApiUrl from file');
            }
            if (typeof fileConfig.faceApiKey === 'string') {
              config.faceApiKey = fileConfig.faceApiKey;
              console.log('[Config] Loaded faceApiKey from file');
            }
          } catch (error) {
            console.error('[Config] Failed to load configuration from file:', {
              path: this.configFilePath,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
            console.warn('[Config] Continuing with environment/default configuration');
          }
        } else {
          console.warn('[Config] Configuration file not found:', this.configFilePath);
        }
      }
    } catch (error) {
      console.error('[Config] Error loading configuration:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      console.warn('[Config] Using default configuration');
    }

    console.log('[Config] Final configuration loaded:', {
      maxFailureAttempts: config.maxFailureAttempts,
      failureResetOnSuccess: config.failureResetOnSuccess,
      failureRecordTTL: parseInt(process.env.FAILURE_RECORD_TTL || '2', 10),
      captureTimeout: config.captureTimeout,
      recognitionThreshold: config.recognitionThreshold,
      useMock: config.useMock,
      debugLogging: process.env.DEBUG_LOGGING === 'true',
      hasRecognitionApiUrl: !!config.recognitionApiUrl,
      hasRecognitionApiKey: !!config.recognitionApiKey,
      hasFaceApiUrl: !!config.faceApiUrl,
      hasFaceApiKey: !!config.faceApiKey
    });

    return config;
  }

  /**
   * Get current max failure attempts limit
   * Returns default value if configuration is invalid
   * Note: 0 is a valid value (unlimited attempts)
   */
  async getMaxFailureAttempts(): Promise<number> {
    try {
      if (this.config.maxFailureAttempts < 0) {
        console.warn('[Config] Invalid maxFailureAttempts, using default:', DEFAULT_CONFIG.maxFailureAttempts);
        return DEFAULT_CONFIG.maxFailureAttempts;
      }
      return this.config.maxFailureAttempts;
    } catch (error) {
      console.error('[Config] Error getting maxFailureAttempts:', error);
      return DEFAULT_CONFIG.maxFailureAttempts;
    }
  }

  /**
   * Get recognition confidence threshold
   * Returns default value if configuration is invalid
   */
  async getRecognitionThreshold(): Promise<number> {
    try {
      if (this.config.recognitionThreshold < 0 || this.config.recognitionThreshold > 100) {
        console.warn('[Config] Invalid recognitionThreshold, using default:', DEFAULT_CONFIG.recognitionThreshold);
        return DEFAULT_CONFIG.recognitionThreshold;
      }
      return this.config.recognitionThreshold;
    } catch (error) {
      console.error('[Config] Error getting recognitionThreshold:', error);
      return DEFAULT_CONFIG.recognitionThreshold;
    }
  }

  /**
   * Get complete configuration
   * Returns copy to prevent external modification
   */
  async getConfiguration(): Promise<AppConfiguration> {
    try {
      return { ...this.config };
    } catch (error) {
      console.error('[Config] Error getting configuration:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Reload configuration from source
   */
  async reloadConfiguration(): Promise<void> {
    const oldConfig = { ...this.config };
    const oldDebugLogging = process.env.DEBUG_LOGGING;
    
    // Reload .env file
    try {
      const dotenv = require('dotenv');
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        console.log('[Config] Reloaded .env file');
      }
    } catch (error) {
      console.warn('[Config] Could not reload .env file:', error);
    }
    
    this.config = this.loadConfigurationSync();
    
    // Log if configuration changed
    const configChanged = JSON.stringify(oldConfig) !== JSON.stringify(this.config);
    const debugLoggingChanged = oldDebugLogging !== process.env.DEBUG_LOGGING;
    
    if (configChanged || debugLoggingChanged) {
      console.log('\n🔄 Configuration reloaded:', {
        configChanged,
        debugLoggingChanged,
        debugLogging: process.env.DEBUG_LOGGING === 'true',
        timestamp: new Date().toISOString()
      });
      
      if (debugLoggingChanged) {
        console.log(`   DEBUG_LOGGING: ${oldDebugLogging} → ${process.env.DEBUG_LOGGING}`);
      }
    }
  }

  /**
   * Start automatic configuration reload (polling)
   * @param intervalMs Polling interval in milliseconds (default: 60000 = 1 minute)
   * 
   * Requirements: 8.3, 8.5 - Apply configuration changes without restart
   */
  startAutoReload(intervalMs: number = 60000): void {
    if (this.reloadIntervalId) {
      console.warn('[Config] Auto-reload already started');
      return;
    }

    this.reloadIntervalId = setInterval(async () => {
      try {
        await this.reloadConfiguration();
      } catch (error) {
        console.error('[Config] Error during auto-reload:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        // Continue with existing configuration on error
        console.warn('[Config] Continuing with existing configuration');
      }
    }, intervalMs);

    console.log(`[Config] Configuration auto-reload started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop automatic configuration reload
   */
  stopAutoReload(): void {
    if (this.reloadIntervalId) {
      clearInterval(this.reloadIntervalId);
      this.reloadIntervalId = null;
      console.log('Configuration auto-reload stopped');
    }
  }
}
