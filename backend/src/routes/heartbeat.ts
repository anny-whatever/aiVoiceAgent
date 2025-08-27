import { Router, Request, Response } from 'express';
import { usageService } from '../lib/usageService.js';
import { tokenManager } from '../lib/tokenManager.js';
import { websocketMonitor } from '../lib/websocketMonitor.js';
import { HeartbeatData } from '../types/usage.js';

const router = Router();

/**
 * Client-side heartbeat endpoint for reliable session tracking
 * This replaces the AI tool call mechanism with direct HTTP calls
 */
router.post('/heartbeat', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔔 Client heartbeat received:', req.body);
    const { sessionToken, timestamp } = req.body;

    // Validate required fields
    if (!sessionToken || !timestamp) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionToken, timestamp',
      });
      return;
    }

    // Verify the session token
    const tokenData = tokenManager.verifySessionToken(sessionToken);
    if (!tokenData) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
        status: 'session_terminated',
      });
      return;
    }

    // Validate session exists in database
    const { valid, session } = await usageService.validateSession(sessionToken);
    if (!valid || !session) {
      res.status(401).json({
        success: false,
        error: 'Session not found or expired',
        status: 'session_terminated',
      });
      return;
    }

    // Validate timestamp is recent (prevent replay attacks)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    const maxTimeDiff = 5 * 60 * 1000; // 5 minutes tolerance

    if (timeDiff > maxTimeDiff) {
      console.warn(`⚠️ Heartbeat timestamp too old: ${timeDiff}ms difference`);
      res.status(400).json({
        success: false,
        error: 'Timestamp too old or too far in future',
      });
      return;
    }

    // Process heartbeat (quotaUsed will be calculated server-side)
    const heartbeatData: HeartbeatData = {
      sessionId: tokenData.sessionId,
      timestamp: timestamp,
      quotaUsed: 0 // This will be overridden by server-side calculation
    };

    const result = await usageService.processHeartbeat(heartbeatData);
    
    if (!result.success) {
      res.status(500).json({
        error: 'Failed to process heartbeat'
      });
      return;
    }

    // Update WebSocket clients with quota information
    const warnings = result.warning ? [result.warning] : [];
    const quotaRemaining = result.sessionTimeRemaining || 0;
    await websocketMonitor.updateSessionQuota(
      tokenData.sessionId, 
      quotaRemaining, 
      warnings
    );
    
    // Terminate session if quota exceeded
    if (result.warning && result.warning.type === 'QUOTA_EXCEEDED') {
      await websocketMonitor.terminateSession(tokenData.sessionId, 'Quota exceeded');
      res.status(429).json({
        error: 'Session quota exceeded',
        remaining: result.warning.remaining
      });
      return;
    }

    res.json({
      success: true,
      sessionId: tokenData.sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Heartbeat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;