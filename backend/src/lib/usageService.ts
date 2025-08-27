import { usageDB } from './usageDatabase.js';
import { tokenManager } from './tokenManager.js';
import {
  UserUsage,
  UserLimits,
  ActiveSession,
  SessionToken,
  UsageValidationResult,
  HeartbeatData,
  QuotaWarning,
  DEFAULT_LIMITS,
  TOKEN_CONFIG,
} from '../types/usage.js';

class UsageService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    await usageDB.initialize();
    
    // Start cleanup interval for expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log('✅ Usage service initialized');
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    await usageDB.close();
  }

  /**
   * Validates if a user can start a new session
   */
  async validateSessionCreation(userId: string, ipAddress: string): Promise<UsageValidationResult> {
    const limits = await usageDB.getUserLimits(userId);
    
    if (!limits.enabled) {
      return {
        allowed: false,
        reason: 'Usage limits disabled for user',
        quotaRemaining: 0,
        sessionTimeRemaining: 0,
      };
    }

    // Check concurrent sessions
    const activeSessions = await usageDB.getUserActiveSessions(userId);
    if (activeSessions.length >= limits.maxConcurrentSessions) {
      return {
        allowed: false,
        reason: `Maximum concurrent sessions (${limits.maxConcurrentSessions}) reached`,
        quotaRemaining: 0,
        sessionTimeRemaining: 0,
      };
    }

    // Check daily quota
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await usageDB.getUserUsage(userId, today);
    const usedToday = todayUsage?.totalSeconds || 0;
    const dailyRemaining = Math.max(0, limits.dailyLimitSeconds - usedToday);

    if (dailyRemaining <= 0) {
      return {
        allowed: false,
        reason: 'Daily quota exceeded',
        quotaRemaining: 0,
        sessionTimeRemaining: 0,
      };
    }

    // Session time remaining should be the daily remaining quota
    // This ensures cumulative usage tracking across sessions
    const sessionTimeRemaining = dailyRemaining;
    const warningThreshold = sessionTimeRemaining <= TOKEN_CONFIG.WARNING_THRESHOLD_SECONDS;

    return {
      allowed: true,
      quotaRemaining: dailyRemaining,
      sessionTimeRemaining,
      warningThreshold,
    };
  }

  /**
   * Creates a new session with token
   */
  async createSession(userId: string, ipAddress: string): Promise<{ token: string; sessionToken: SessionToken; quotaRemaining: number } | null> {
    const validation = await this.validateSessionCreation(userId, ipAddress);
    
    if (!validation.allowed) {
      return null;
    }

    const sessionId = this.generateSessionId();
    const { token, sessionToken } = tokenManager.createSessionToken(
      userId,
      sessionId,
      validation.sessionTimeRemaining,
      ipAddress
    );

    // Create active session record
    const activeSession: ActiveSession = {
      sessionId,
      userId,
      startTime: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      quotaUsed: 0,
      tokenExpiry: sessionToken.expiresAt,
      ipAddress,
    };

    await usageDB.createActiveSession(activeSession);

    return {
      token,
      sessionToken,
      quotaRemaining: validation.quotaRemaining,
    };
  }

  /**
   * Validates an existing session token
   */
  async validateSession(token: string): Promise<{ valid: boolean; session?: ActiveSession; remaining?: number }> {
    const sessionToken = tokenManager.verifySessionToken(token);
    
    if (!sessionToken) {
      return { valid: false };
    }

    const activeSession = await usageDB.getActiveSession(sessionToken.sessionId);
    
    if (!activeSession) {
      return { valid: false };
    }

    // Check if session has expired
    if (tokenManager.isTokenExpired(sessionToken)) {
      await this.endSession(sessionToken.sessionId);
      return { valid: false };
    }

    const remaining = tokenManager.getRemainingTime(sessionToken);
    
    return {
      valid: true,
      session: activeSession,
      remaining,
    };
  }

  /**
   * Processes a heartbeat from the AI
   */
  async processHeartbeat(heartbeatData: HeartbeatData): Promise<{ success: boolean; warning?: QuotaWarning }> {
    const activeSession = await usageDB.getActiveSession(heartbeatData.sessionId);
    
    if (!activeSession) {
      return { success: false };
    }

    // Update session with new heartbeat and quota usage
    await usageDB.updateActiveSession(heartbeatData.sessionId, {
      lastHeartbeat: new Date().toISOString(),
      quotaUsed: heartbeatData.quotaUsed,
    });

    // Check if approaching limits based on daily quota
    const limits = await usageDB.getUserLimits(activeSession.userId);
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await usageDB.getUserUsage(activeSession.userId, today);
    const usedToday = (todayUsage?.totalSeconds || 0) + heartbeatData.quotaUsed;
    const dailyRemaining = Math.max(0, limits.dailyLimitSeconds - usedToday);

    // Generate warning if approaching limits
    let warning: QuotaWarning | undefined;
    
    if (dailyRemaining <= TOKEN_CONFIG.WARNING_THRESHOLD_SECONDS && dailyRemaining > 0) {
      warning = {
        type: 'QUOTA_WARNING',
        remaining: dailyRemaining,
        message: `Daily quota will be exhausted in ${Math.floor(dailyRemaining / 60)} minutes`,
      };
    } else if (dailyRemaining <= 0) {
      warning = {
        type: 'QUOTA_EXCEEDED',
        remaining: 0,
        message: 'Daily quota exceeded',
      };
      
      // End the session
      await this.endSession(heartbeatData.sessionId);
    }

    return { success: true, warning };
  }

  /**
   * Ends a session and updates usage statistics
   */
  async endSession(sessionId: string): Promise<void> {
    const activeSession = await usageDB.getActiveSession(sessionId);
    
    if (!activeSession) {
      return;
    }

    // Update daily usage statistics
    const today = new Date().toISOString().split('T')[0];
    const existingUsage = await usageDB.getUserUsage(activeSession.userId, today);
    
    const updatedUsage: UserUsage = {
      userId: activeSession.userId,
      date: today,
      totalSeconds: (existingUsage?.totalSeconds || 0) + activeSession.quotaUsed,
      sessionsCount: (existingUsage?.sessionsCount || 0) + 1,
      lastReset: existingUsage?.lastReset || new Date().toISOString(),
    };

    await usageDB.updateUserUsage(updatedUsage);
    await usageDB.deleteActiveSession(sessionId);
  }

  /**
   * Gets current usage statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    dailyUsage: UserUsage | null;
    limits: UserLimits;
    activeSessions: ActiveSession[];
    quotaRemaining: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const [dailyUsage, limits, activeSessions] = await Promise.all([
      usageDB.getUserUsage(userId, today),
      usageDB.getUserLimits(userId),
      usageDB.getUserActiveSessions(userId),
    ]);

    const usedToday = dailyUsage?.totalSeconds || 0;
    const quotaRemaining = Math.max(0, limits.dailyLimitSeconds - usedToday);

    return {
      dailyUsage,
      limits,
      activeSessions,
      quotaRemaining,
    };
  }

  /**
   * Updates user limits (admin function)
   */
  async updateUserLimits(userId: string, limits: Partial<UserLimits>): Promise<void> {
    const currentLimits = await usageDB.getUserLimits(userId);
    const updatedLimits: UserLimits = {
      ...currentLimits,
      ...limits,
      userId, // Ensure userId is preserved
    };
    
    await usageDB.setUserLimits(updatedLimits);
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      await usageDB.cleanupExpiredSessions();
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Force end all sessions for a user (admin function)
   */
  async forceEndUserSessions(userId: string): Promise<void> {
    const activeSessions = await usageDB.getUserActiveSessions(userId);
    
    for (const session of activeSessions) {
      await this.endSession(session.sessionId);
    }
  }

  /**
   * Reset daily usage for a user (admin function)
   */
  async resetDailyUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const resetUsage: UserUsage = {
      userId,
      date: today,
      totalSeconds: 0,
      sessionsCount: 0,
      lastReset: new Date().toISOString(),
    };
    
    await usageDB.updateUserUsage(resetUsage);
  }
}

// Singleton instance
export const usageService = new UsageService();