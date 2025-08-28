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
  SESSION_TIME_CONFIG,
} from '../types/usage.js';

class UsageService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    await usageDB.initialize();
    
    // Start cleanup interval for expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, 2 * 60 * 1000); // Every 2 minutes
    
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

    // Check concurrent sessions and clean up stale ones
    const activeSessions = await usageDB.getUserActiveSessions(userId);
    console.log(`📊 Found ${activeSessions.length} active sessions for user ${userId}`);
    
    // Clean up sessions that haven't sent heartbeats for more than 5 minutes (more aggressive)
    const staleThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    const staleSessions = activeSessions.filter(session => {
      const lastHeartbeat = new Date(session.lastHeartbeat).getTime();
      const isStale = lastHeartbeat < staleThreshold;
      if (isStale) {
        const minutesStale = Math.floor((Date.now() - lastHeartbeat) / (60 * 1000));
        console.log(`🕐 Session ${session.sessionId} is stale (${minutesStale} minutes old)`);
      }
      return isStale;
    });
    
    console.log(`🧹 Found ${staleSessions.length} stale sessions to clean up`);
    
    // Remove stale sessions
    for (const staleSession of staleSessions) {
      await usageDB.deleteActiveSession(staleSession.sessionId);
      console.log(`✅ Cleaned up stale session: ${staleSession.sessionId}`);
    }
    
    // Get updated active sessions count after cleanup
    const currentActiveSessions = activeSessions.filter(session => {
      const lastHeartbeat = new Date(session.lastHeartbeat).getTime();
      return lastHeartbeat >= staleThreshold;
    });
    
    console.log(`📈 Active sessions after cleanup: ${currentActiveSessions.length}/${limits.maxConcurrentSessions}`);
    
    if (currentActiveSessions.length >= limits.maxConcurrentSessions) {
      return {
        allowed: false,
        reason: `Maximum concurrent sessions (${limits.maxConcurrentSessions}) reached`,
        quotaRemaining: 0,
        sessionTimeRemaining: 0,
      };
    }

    // Get or initialize session time tracking
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    let monthlyUsage = await usageDB.getUserUsage(userId, currentMonth);
    
    // Initialize usage record if it doesn't exist
    if (!monthlyUsage) {
      monthlyUsage = {
        userId,
        month: currentMonth,
        totalSeconds: 0,
        sessionTimeRemaining: SESSION_TIME_CONFIG.INITIAL_SESSION_TIME,
      };
      await usageDB.updateUserUsage(monthlyUsage);
    }

    // Check if we have any session time remaining
    const sessionTimeRemaining = monthlyUsage.sessionTimeRemaining || 0;
    
    if (sessionTimeRemaining < SESSION_TIME_CONFIG.MIN_SESSION_TIME) {
      return {
        allowed: false,
        reason: 'No session time remaining',
        quotaRemaining: 0,
        sessionTimeRemaining: 0,
      };
    }

    // Cap session time to maximum allowed
    const actualSessionTime = Math.min(sessionTimeRemaining, SESSION_TIME_CONFIG.MAX_SESSION_TIME);
    const warningThreshold = actualSessionTime <= TOKEN_CONFIG.WARNING_THRESHOLD_SECONDS;

    return {
      allowed: true,
      quotaRemaining: actualSessionTime,
      sessionTimeRemaining: actualSessionTime,
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
      quotaRemaining: validation.sessionTimeRemaining,
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
   * Processes a heartbeat from the client
   */
  async processHeartbeat(heartbeatData: HeartbeatData): Promise<{ success: boolean; warning?: QuotaWarning; sessionTimeRemaining?: number }> {
    const activeSession = await usageDB.getActiveSession(heartbeatData.sessionId);
    
    if (!activeSession) {
      return { success: false };
    }

    // Calculate elapsed time since last heartbeat (incremental, not cumulative)
    const lastHeartbeatTime = new Date(activeSession.lastHeartbeat).getTime();
    const currentTime = Date.now();
    const incrementalSeconds = Math.floor((currentTime - lastHeartbeatTime) / 1000);
    const newQuotaUsed = activeSession.quotaUsed + incrementalSeconds;
    
    console.log('💓 Processing heartbeat for session:', heartbeatData.sessionId, 'incremental time:', incrementalSeconds, 'seconds, total used:', newQuotaUsed, 'seconds');

    // Update session with new heartbeat timestamp and incremental quota usage
    await usageDB.updateActiveSession(heartbeatData.sessionId, {
      lastHeartbeat: new Date().toISOString(),
      quotaUsed: newQuotaUsed,
    });

    console.log('📝 Updating active session:', heartbeatData.sessionId, 'with:', { lastHeartbeat: new Date().toISOString(), quotaUsed: newQuotaUsed });
    console.log('✅ Active session updated in database');

    // Get current usage to calculate remaining session time for warnings
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const monthlyUsage = await usageDB.getUserUsage(activeSession.userId, currentMonth);
    const currentSessionTimeRemaining = monthlyUsage?.sessionTimeRemaining || SESSION_TIME_CONFIG.INITIAL_SESSION_TIME;
    const sessionTimeRemaining = Math.max(0, currentSessionTimeRemaining - incrementalSeconds);

    // Update user usage with current session time remaining for display purposes
    if (monthlyUsage) {
      const updatedUsage = {
        ...monthlyUsage,
        sessionTimeRemaining,
      };
      await usageDB.updateUserUsage(updatedUsage);
      console.log('💾 Updating user usage:', updatedUsage);
      console.log('✅ User usage updated in database');
    }

    // Generate warning if approaching limits
    let warning: QuotaWarning | undefined;
    
    if (sessionTimeRemaining <= TOKEN_CONFIG.WARNING_THRESHOLD_SECONDS && sessionTimeRemaining > 0) {
      warning = {
        type: 'QUOTA_WARNING',
        remaining: sessionTimeRemaining,
        message: `Session will end in ${Math.floor(sessionTimeRemaining / 60)} minutes`,
      };
    } else if (sessionTimeRemaining <= 0) {
      warning = {
        type: 'QUOTA_EXCEEDED',
        remaining: 0,
        message: 'Session time exceeded',
      };
      
      // End the session
      await this.endSession(heartbeatData.sessionId);
    }

    return { success: true, warning, sessionTimeRemaining };
  }

  /**
   * Ends a session and updates usage statistics
   */
  async endSession(sessionId: string): Promise<void> {
    const activeSession = await usageDB.getActiveSession(sessionId);
    
    if (!activeSession) {
      return;
    }

    // Update monthly usage statistics
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const existingUsage = await usageDB.getUserUsage(activeSession.userId, currentMonth);
    
    // Calculate remaining time after this session
    const timeUsedInSession = activeSession.quotaUsed;
    const currentRemaining = existingUsage?.sessionTimeRemaining || SESSION_TIME_CONFIG.INITIAL_SESSION_TIME;
    const newRemaining = Math.max(0, currentRemaining - timeUsedInSession);
    
    const updatedUsage: UserUsage = {
      userId: activeSession.userId,
      month: currentMonth,
      totalSeconds: (existingUsage?.totalSeconds || 0) + timeUsedInSession,
      sessionTimeRemaining: newRemaining,
    };

    await usageDB.updateUserUsage(updatedUsage);
    await usageDB.deleteActiveSession(sessionId);

    console.log(`📊 Session ${sessionId} ended. User ${activeSession.userId} used ${timeUsedInSession}s, ${newRemaining}s remaining`);
  }

  /**
   * Gets current usage statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    monthlyUsage: UserUsage | null;
    limits: UserLimits;
    activeSessions: ActiveSession[];
    quotaRemaining: number;
  }> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const [monthlyUsage, limits, activeSessions] = await Promise.all([
      usageDB.getUserUsage(userId, currentMonth),
      usageDB.getUserLimits(userId),
      usageDB.getUserActiveSessions(userId),
    ]);

    const usedThisMonth = monthlyUsage?.totalSeconds || 0;
    const quotaRemaining = monthlyUsage?.sessionTimeRemaining || 0;

    return {
      monthlyUsage,
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
   * Cleanup expired sessions based on server-side time calculation
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      // Get all active sessions
      const allActiveSessions = await usageDB.getAllActiveSessions();
      const currentTime = Date.now();
      
      for (const session of allActiveSessions) {
        // Get user's monthly usage to check remaining time
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyUsage = await usageDB.getUserUsage(session.userId, currentMonth);
        
        if (monthlyUsage) {
          const sessionTimeRemaining = Math.max(0, monthlyUsage.sessionTimeRemaining - session.quotaUsed);
          
          // If session has exceeded time limit, end it
          if (sessionTimeRemaining <= 0) {
            console.log(`🕒 Auto-expiring session ${session.sessionId} - time exceeded (${session.quotaUsed}s used)`);
            await this.endSession(session.sessionId);
          }
        }
        
        // Also cleanup stale sessions (no heartbeat for 5+ minutes)
        const lastHeartbeat = new Date(session.lastHeartbeat).getTime();
        const staleThreshold = currentTime - (5 * 60 * 1000); // 5 minutes
        
        if (lastHeartbeat < staleThreshold) {
          const minutesStale = Math.floor((currentTime - lastHeartbeat) / (60 * 1000));
          console.log(`🧹 Cleaning up stale session ${session.sessionId} - no heartbeat for ${minutesStale} minutes`);
          await usageDB.deleteActiveSession(session.sessionId);
        }
      }
      
      // Also run the original database cleanup
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
  async resetMonthlyUsage(userId: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const resetUsage: UserUsage = {
      userId,
      month: currentMonth,
      totalSeconds: 0,
      sessionTimeRemaining: SESSION_TIME_CONFIG.INITIAL_SESSION_TIME,
    };
    
    await usageDB.updateUserUsage(resetUsage);
  }
}

// Singleton instance
export const usageService = new UsageService();