import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IConfigurationService } from '../types/config.types';
import { IFailureTrackingService } from '../types/failure.types';
import { debugLog, infoLog, errorLog } from '../utils/logger';

/**
 * Failure tracking service using SQLite for persistence
 * Tracks user authentication failures and implements lockout mechanism
 */
export class FailureTrackingServiceSQLite implements IFailureTrackingService {
  private db: Database.Database;
  private configService: IConfigurationService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(configService: IConfigurationService) {
    this.configService = configService;
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize SQLite database
    const dbPath = path.join(dataDir, 'failures.db');
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    this.initDatabase();
    this.startCleanupScheduler();
    
    infoLog('[FailureTrackingServiceSQLite] Initialized with database at: ' + dbPath);
  }

  /**
   * Initialize database schema
   */
  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_failures (
        user_id TEXT PRIMARY KEY,
        failure_count INTEGER DEFAULT 0,
        locked_until INTEGER,
        last_failure INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
      
      CREATE INDEX IF NOT EXISTS idx_locked_until ON user_failures(locked_until);
      CREATE INDEX IF NOT EXISTS idx_last_failure ON user_failures(last_failure);
    `);
    
    debugLog('[FailureTrackingServiceSQLite] Database schema initialized');
  }

  /**
   * Start automatic cleanup scheduler (runs every hour)
   */
  private startCleanupScheduler(): void {
    // Run cleanup immediately on startup
    this.cleanupOldRecords();
    
    // Schedule cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1000); // 1 hour
    
    debugLog('[FailureTrackingServiceSQLite] Cleanup scheduler started');
  }

  /**
   * Clean up records older than 24 hours
   */
  private cleanupOldRecords(): void {
    try {
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      const stmt = this.db.prepare(`
        DELETE FROM user_failures 
        WHERE last_failure < ? 
          AND (locked_until IS NULL OR locked_until < ?)
      `);
      
      const result = stmt.run(twentyFourHoursAgo, Date.now());
      
      if (result.changes > 0) {
        infoLog(`[FailureTrackingServiceSQLite] Cleaned up ${result.changes} old records`);
      }
    } catch (error) {
      errorLog('[FailureTrackingServiceSQLite] Error during cleanup:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Record a failure for a user
   */
  async recordFailure(userId: string): Promise<void> {
    const config = await this.configService.getConfiguration();
    const now = Date.now();
    
    // Insert or update failure record
    const upsertStmt = this.db.prepare(`
      INSERT INTO user_failures (user_id, failure_count, last_failure)
      VALUES (?, 1, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        failure_count = failure_count + 1,
        last_failure = ?
    `);
    
    upsertStmt.run(userId, now, now);
    
    // Check if user should be locked
    const selectStmt = this.db.prepare(`
      SELECT failure_count 
      FROM user_failures 
      WHERE user_id = ?
    `);
    
    const result = selectStmt.get(userId) as { failure_count: number } | undefined;
    
    if (result && config.maxFailureAttempts > 0 && result.failure_count >= config.maxFailureAttempts) {
      // Lock user for configured duration (using FAILURE_RECORD_TTL from env)
      const ttlMinutes = parseInt(process.env.FAILURE_RECORD_TTL || '2', 10);
      const lockUntil = now + (ttlMinutes * 60 * 1000);
      
      const lockStmt = this.db.prepare(`
        UPDATE user_failures 
        SET locked_until = ? 
        WHERE user_id = ?
      `);
      
      lockStmt.run(lockUntil, userId);
      
      debugLog('[FailureTrackingServiceSQLite] User locked:', {
        userId,
        failureCount: result.failure_count,
        lockUntil: new Date(lockUntil).toISOString()
      });
    }
  }

  /**
   * Check if a user is currently locked
   */
  async isUserLocked(userId: string): Promise<boolean> {
    const config = await this.configService.getConfiguration();
    
    // If max attempts is 0, lockout is disabled
    if (config.maxFailureAttempts === 0) {
      return false;
    }
    
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      SELECT locked_until 
      FROM user_failures 
      WHERE user_id = ? 
        AND locked_until > ?
    `);
    
    const result = stmt.get(userId, now);
    return result !== undefined;
  }

  /**
   * Get remaining attempts for a user
   */
  async getRemainingAttempts(userId: string): Promise<number> {
    const config = await this.configService.getConfiguration();
    
    // If max attempts is 0, return 99 (unlimited)
    if (config.maxFailureAttempts === 0) {
      return 99;
    }
    
    const stmt = this.db.prepare(`
      SELECT failure_count 
      FROM user_failures 
      WHERE user_id = ?
    `);
    
    const result = stmt.get(userId) as { failure_count: number } | undefined;
    
    if (!result) {
      return config.maxFailureAttempts;
    }
    
    const remaining = config.maxFailureAttempts - result.failure_count;
    return Math.max(0, remaining);
  }

  /**
   * Get minutes until lockout expires
   */
  async getMinutesUntilExpiry(userId: string): Promise<number> {
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      SELECT locked_until 
      FROM user_failures 
      WHERE user_id = ?
    `);
    
    const result = stmt.get(userId) as { locked_until: number | null } | undefined;
    
    if (!result || !result.locked_until) {
      return 0;
    }
    
    const msRemaining = result.locked_until - now;
    if (msRemaining <= 0) {
      return 0;
    }
    
    return Math.ceil(msRemaining / (60 * 1000));
  }

  /**
   * Reset failures for a user
   */
  async resetFailures(userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM user_failures 
      WHERE user_id = ?
    `);
    
    stmt.run(userId);
    
    debugLog('[FailureTrackingServiceSQLite] Failures reset for user:', userId);
  }

  /**
   * Close database connection and cleanup
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.db.close();
    infoLog('[FailureTrackingServiceSQLite] Database connection closed');
  }
}
