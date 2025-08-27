import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  UserUsage,
  UserLimits,
  ActiveSession,
  DEFAULT_LIMITS,
} from '../types/usage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UsageDatabase {
  private db: sqlite3.Database | null = null;
  private jsonFallback = {
    usage: new Map<string, UserUsage>(),
    limits: new Map<string, UserLimits>(),
    sessions: new Map<string, ActiveSession>(),
  };
  private dbPath: string;
  private jsonPath: string;
  private useJsonFallback = false;

  constructor() {
    this.dbPath = path.join(__dirname, '../../data/usage.db');
    this.jsonPath = path.join(__dirname, '../../data/usage.json');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      
      // Try SQLite first
      await this.initializeSQLite();
      console.log('✅ SQLite usage database initialized');
    } catch (error) {
      console.warn('⚠️ SQLite failed, falling back to JSON:', error);
      this.useJsonFallback = true;
      await this.initializeJSON();
      console.log('✅ JSON fallback usage database initialized');
    }
  }

  private async initializeSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // First, check if we need to migrate existing tables
        this.db!.get("PRAGMA table_info(user_usage)", (err: Error | null, result: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Check if session_time_remaining column exists
          this.db!.all("PRAGMA table_info(user_usage)", (err: Error | null, columns: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            const hasSessionTimeColumn = columns && columns.some(col => col.name === 'session_time_remaining');
            
            let migrationSQL = '';
            if (columns && columns.length > 0 && !hasSessionTimeColumn) {
              // Table exists but missing the column - add it
              migrationSQL = 'ALTER TABLE user_usage ADD COLUMN session_time_remaining INTEGER DEFAULT 0;';
              console.log('🔧 Adding missing session_time_remaining column to user_usage table');
            }

            // Create tables and run migration
            const createTables = `
              ${migrationSQL}
              
              CREATE TABLE IF NOT EXISTS user_usage (
                user_id TEXT,
                month TEXT,
                total_seconds INTEGER DEFAULT 0,
                sessions_count INTEGER DEFAULT 0,
                last_reset TEXT,
                session_time_remaining INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, month)
              );

              CREATE TABLE IF NOT EXISTS user_limits (
                user_id TEXT PRIMARY KEY,
                monthly_limit_seconds INTEGER DEFAULT ${DEFAULT_LIMITS.monthlyLimitSeconds},
                session_limit_seconds INTEGER DEFAULT ${DEFAULT_LIMITS.sessionLimitSeconds},
                max_concurrent_sessions INTEGER DEFAULT ${DEFAULT_LIMITS.maxConcurrentSessions},
                enabled INTEGER DEFAULT 1
              );

              CREATE TABLE IF NOT EXISTS active_sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT,
                start_time TEXT,
                last_heartbeat TEXT,
                quota_used INTEGER DEFAULT 0,
                token_expiry INTEGER,
                ip_address TEXT
              );

              CREATE INDEX IF NOT EXISTS idx_user_usage_date ON user_usage(user_id, date);
              CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
              CREATE INDEX IF NOT EXISTS idx_active_sessions_expiry ON active_sessions(token_expiry);
            `;

            this.db!.exec(createTables, (err: Error | null) => {
              if (err) {
                reject(err);
              } else {
                console.log('✅ Database schema updated successfully');
                resolve();
              }
            });
          });
        });
      });
    });
  }

  private async initializeJSON(): Promise<void> {
    try {
      const data = await fs.readFile(this.jsonPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Load data into memory maps
      if (parsed.usage) {
        for (const [key, value] of Object.entries(parsed.usage)) {
          this.jsonFallback.usage.set(key, value as UserUsage);
        }
      }
      if (parsed.limits) {
        for (const [key, value] of Object.entries(parsed.limits)) {
          this.jsonFallback.limits.set(key, value as UserLimits);
        }
      }
      if (parsed.sessions) {
        for (const [key, value] of Object.entries(parsed.sessions)) {
          this.jsonFallback.sessions.set(key, value as ActiveSession);
        }
      }
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      await this.saveJSON();
    }
  }

  private async saveJSON(): Promise<void> {
    if (!this.useJsonFallback) return;
    
    const data = {
      usage: Object.fromEntries(this.jsonFallback.usage),
      limits: Object.fromEntries(this.jsonFallback.limits),
      sessions: Object.fromEntries(this.jsonFallback.sessions),
    };
    
    await fs.writeFile(this.jsonPath, JSON.stringify(data, null, 2));
  }

  // User Usage Methods
  async getUserUsage(userId: string, month: string): Promise<UserUsage | null> {
    if (this.useJsonFallback) {
      const key = `${userId}:${month}`;
      return this.jsonFallback.usage.get(key) || null;
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT * FROM user_usage WHERE user_id = ? AND month = ?',
        [userId, month],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? {
              userId: row.user_id,
              month: row.month,
              totalSeconds: row.total_seconds,
              sessionsCount: row.sessions_count,
              lastReset: row.last_reset,
              sessionTimeRemaining: row.session_time_remaining || 0,
            } : null);
          }
        }
      );
    });
  }

  async updateUserUsage(usage: UserUsage): Promise<void> {
    console.log('💾 Updating user usage:', usage);
    if (this.useJsonFallback) {
      const key = `${usage.userId}:${usage.month}`;
      this.jsonFallback.usage.set(key, usage);
      await this.saveJSON();
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO user_usage 
         (user_id, month, total_seconds, sessions_count, last_reset, session_time_remaining) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usage.userId, usage.month, usage.totalSeconds, usage.sessionsCount, usage.lastReset, usage.sessionTimeRemaining],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ User usage updated in database');
            resolve();
          }
        }
      );
    });
  }

  // User Limits Methods
  async getUserLimits(userId: string): Promise<UserLimits> {
    if (this.useJsonFallback) {
      return this.jsonFallback.limits.get(userId) || {
        userId,
        ...DEFAULT_LIMITS,
      };
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT * FROM user_limits WHERE user_id = ?',
        [userId],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? {
              userId: row.user_id,
              monthlyLimitSeconds: row.monthly_limit_seconds,
              sessionLimitSeconds: row.session_limit_seconds,
              maxConcurrentSessions: row.max_concurrent_sessions,
              enabled: Boolean(row.enabled),
            } : {
              userId,
              ...DEFAULT_LIMITS,
            });
          }
        }
      );
    });
  }

  async setUserLimits(limits: UserLimits): Promise<void> {
    if (this.useJsonFallback) {
      this.jsonFallback.limits.set(limits.userId, limits);
      await this.saveJSON();
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO user_limits 
         (user_id, monthly_limit_seconds, session_limit_seconds, max_concurrent_sessions, enabled) 
         VALUES (?, ?, ?, ?, ?)`,
        [limits.userId, limits.monthlyLimitSeconds, limits.sessionLimitSeconds, 
         limits.maxConcurrentSessions, limits.enabled ? 1 : 0],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // Active Sessions Methods
  async getActiveSession(sessionId: string): Promise<ActiveSession | null> {
    if (this.useJsonFallback) {
      return this.jsonFallback.sessions.get(sessionId) || null;
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT * FROM active_sessions WHERE session_id = ?',
        [sessionId],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? {
              sessionId: row.session_id,
              userId: row.user_id,
              startTime: row.start_time,
              lastHeartbeat: row.last_heartbeat,
              quotaUsed: row.quota_used,
              tokenExpiry: row.token_expiry,
              ipAddress: row.ip_address,
            } : null);
          }
        }
      );
    });
  }

  async getUserActiveSessions(userId: string): Promise<ActiveSession[]> {
    if (this.useJsonFallback) {
      return Array.from(this.jsonFallback.sessions.values())
        .filter(session => session.userId === userId);
    }

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM active_sessions WHERE user_id = ?',
        [userId],
        (err: Error | null, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              sessionId: row.session_id,
              userId: row.user_id,
              startTime: row.start_time,
              lastHeartbeat: row.last_heartbeat,
              quotaUsed: row.quota_used,
              tokenExpiry: row.token_expiry,
              ipAddress: row.ip_address,
            })));
          }
        }
      );
    });
  }

  async createActiveSession(session: ActiveSession): Promise<void> {
    if (this.useJsonFallback) {
      this.jsonFallback.sessions.set(session.sessionId, session);
      await this.saveJSON();
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO active_sessions 
         (session_id, user_id, start_time, last_heartbeat, quota_used, token_expiry, ip_address) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [session.sessionId, session.userId, session.startTime, session.lastHeartbeat,
         session.quotaUsed, session.tokenExpiry, session.ipAddress],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async updateActiveSession(sessionId: string, updates: Partial<ActiveSession>): Promise<void> {
    console.log('📝 Updating active session:', sessionId, 'with:', updates);
    if (this.useJsonFallback) {
      const existing = this.jsonFallback.sessions.get(sessionId);
      if (existing) {
        this.jsonFallback.sessions.set(sessionId, { ...existing, ...updates });
        await this.saveJSON();
      }
      return;
    }

    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${dbKey} = ?`;
      })
      .join(', ');
    
    const values = Object.values(updates);
    values.push(sessionId);

    return new Promise((resolve, reject) => {
      this.db!.run(
        `UPDATE active_sessions SET ${setClause} WHERE session_id = ?`,
        values,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Active session updated in database');
            resolve();
          }
        }
      );
    });
  }

  async deleteActiveSession(sessionId: string): Promise<void> {
    if (this.useJsonFallback) {
      this.jsonFallback.sessions.delete(sessionId);
      await this.saveJSON();
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        'DELETE FROM active_sessions WHERE session_id = ?',
        [sessionId],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    
    if (this.useJsonFallback) {
      for (const [sessionId, session] of this.jsonFallback.sessions.entries()) {
        if (session.tokenExpiry < now) {
          this.jsonFallback.sessions.delete(sessionId);
        }
      }
      await this.saveJSON();
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        'DELETE FROM active_sessions WHERE token_expiry < ?',
        [now],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async close(): Promise<void> {
    if (this.useJsonFallback) {
      await this.saveJSON();
      return;
    }

    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
export const usageDB = new UsageDatabase();