export interface UserUsage {
  userId: string;
  date: string; // YYYY-MM-DD format
  totalSeconds: number;
  sessionsCount: number;
  lastReset: string; // ISO timestamp
}

export interface UserLimits {
  userId: string;
  dailyLimitSeconds: number;
  sessionLimitSeconds: number;
  maxConcurrentSessions: number;
  enabled: boolean;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  startTime: string; // ISO timestamp
  lastHeartbeat: string; // ISO timestamp
  quotaUsed: number; // seconds
  tokenExpiry: number; // Unix timestamp
  ipAddress: string;
}

export interface SessionToken {
  userId: string;
  sessionId: string;
  quotaRemaining: number; // seconds
  issuedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  signature?: string;
}

export interface UsageValidationResult {
  allowed: boolean;
  reason?: string;
  quotaRemaining: number;
  sessionTimeRemaining: number;
  warningThreshold?: boolean;
}

export interface HeartbeatData {
  sessionId: string;
  timestamp: number;
  quotaUsed: number;
}

export interface QuotaWarning {
  type: 'QUOTA_WARNING' | 'QUOTA_EXCEEDED' | 'SESSION_EXPIRED';
  remaining: number;
  message: string;
}

// Default limits
export const DEFAULT_LIMITS: Omit<UserLimits, 'userId'> = {
  dailyLimitSeconds: 15 * 60, // 15 minutes
  sessionLimitSeconds: 15 * 60, // 15 minutes
  maxConcurrentSessions: 3,
  enabled: true,
};

// Token configuration
export const TOKEN_CONFIG = {
  EXPIRY_MINUTES: 10, // Short-lived tokens
  RENEWAL_THRESHOLD_MINUTES: 2, // Renew when 2 minutes left
  HEARTBEAT_INTERVAL_SECONDS: 60, // Mandatory heartbeat every 60s
  WARNING_THRESHOLD_SECONDS: 5 * 60, // Warn when 5 minutes left
};