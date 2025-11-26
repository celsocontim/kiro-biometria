/**
 * Configuration schema for the facial recognition application
 */
export interface AppConfiguration {
  /** Maximum number of failed recognition attempts before user lockout */
  maxFailureAttempts: number;
  
  /** Whether to reset failure count on successful recognition */
  failureResetOnSuccess: boolean;
  
  /** Timeout for capture operations in milliseconds */
  captureTimeout: number;
  
  /** URL of the external recognition API */
  recognitionApiUrl: string;
  
  /** API key for the external recognition service */
  recognitionApiKey: string;
  
  /** Recognition confidence threshold (0-100). Scores >= threshold are considered recognized */
  recognitionThreshold: number;
  
  /** Force failure mode for testing - generates confidence scores below threshold */
  forceFailure: boolean;
}

/**
 * Interface for configuration service
 */
export interface IConfigurationService {
  /** Get current max failure attempts limit */
  getMaxFailureAttempts(): Promise<number>;
  
  /** Get recognition confidence threshold */
  getRecognitionThreshold(): Promise<number>;
  
  /** Get complete configuration */
  getConfiguration(): Promise<AppConfiguration>;
  
  /** Reload configuration from source */
  reloadConfiguration(): Promise<void>;
  
  /** Start automatic configuration reload (polling) */
  startAutoReload(intervalMs?: number): void;
  
  /** Stop automatic configuration reload */
  stopAutoReload(): void;
}
