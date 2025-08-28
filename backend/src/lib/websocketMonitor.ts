import WebSocket, { WebSocketServer } from 'ws';
import { usageService } from './usageService';
import { tokenManager } from './tokenManager';
import { QuotaWarning } from '../types/usage';

interface MonitoredSession {
  sessionId: string;
  userId: string;
  websocket: WebSocket;
  lastHeartbeat: number;
  quotaRemaining: number;
  warningsSent: Set<number>; // Track which warning thresholds have been sent
}

class WebSocketMonitor {
  private sessions = new Map<string, MonitoredSession>();
  private wss: WebSocketServer | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly WARNING_THRESHOLDS = [300, 180, 60, 30, 10]; // seconds
  private readonly HEARTBEAT_TIMEOUT = 90000; // 90 seconds

  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/monitor'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('📡 WebSocket monitor connection established');
      
      // Extract session token from query params or headers
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        ws.close(4001, 'Missing session token');
        return;
      }

      this.handleConnection(ws, token);
    });

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Every 30 seconds

    console.log('✅ WebSocket monitor initialized');
  }

  private async handleConnection(ws: WebSocket, token: string) {
    try {
      const sessionToken = tokenManager.verifySessionToken(token);
      if (!sessionToken) {
        ws.close(4002, 'Invalid session token');
        return;
      }

      const { sessionId, userId } = sessionToken;
      
      // Check if session exists and is active
      const sessionExists = await usageService.validateSession(token);
      if (!sessionExists.valid) {
        ws.close(4003, 'Session not found or expired');
        return;
      }

      // Register the session
      const monitoredSession: MonitoredSession = {
        sessionId,
        userId,
        websocket: ws,
        lastHeartbeat: Date.now(),
        quotaRemaining: sessionToken.quotaRemaining,
        warningsSent: new Set()
      };

      this.sessions.set(sessionId, monitoredSession);
      console.log(`📡 Session ${sessionId} connected to monitor`);

      // Send initial status
      this.sendMessage(ws, {
        type: 'connected',
        sessionId,
        quotaRemaining: sessionToken.quotaRemaining,
        timestamp: Date.now()
      });

      // Handle WebSocket events
      ws.on('close', () => {
        this.sessions.delete(sessionId);
        console.log(`📡 Session ${sessionId} disconnected from monitor`);
      });

      ws.on('error', (error) => {
        console.error(`📡 WebSocket error for session ${sessionId}:`, error);
        this.sessions.delete(sessionId);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(sessionId, message);
        } catch (error) {
          console.error('📡 Invalid WebSocket message:', error);
        }
      });

    } catch (error) {
      console.error('📡 Error handling WebSocket connection:', error);
      ws.close(4000, 'Internal server error');
    }
  }

  private handleMessage(sessionId: string, message: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (message.type) {
      case 'ping':
        session.lastHeartbeat = Date.now();
        this.sendMessage(session.websocket, {
          type: 'pong',
          timestamp: Date.now()
        });
        break;
      
      case 'status_request':
        this.sendSessionStatus(session);
        break;
    }
  }

  private async sendSessionStatus(session: MonitoredSession) {
    try {
      const stats = await usageService.getUserStats(session.userId);
      this.sendMessage(session.websocket, {
        type: 'status',
        sessionId: session.sessionId,
        quotaRemaining: stats.quotaRemaining,
        monthlyUsage: stats.monthlyUsage,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('📡 Error sending session status:', error);
    }
  }

  // Called by heartbeat handler to update quota and send warnings
  async updateSessionQuota(sessionId: string, quotaRemaining: number, warnings: QuotaWarning[]) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.quotaRemaining = quotaRemaining;
    session.lastHeartbeat = Date.now();

    // Send quota update
    this.sendMessage(session.websocket, {
      type: 'quota_update',
      sessionId,
      quotaRemaining,
      timestamp: Date.now()
    });

    // Send warnings for new thresholds
    for (const warning of warnings) {
      const thresholdSeconds = Math.floor(warning.remaining / 1000);
      
      // Only send warning if we haven't sent it for this threshold yet
      if (!session.warningsSent.has(thresholdSeconds)) {
        session.warningsSent.add(thresholdSeconds);
        
        this.sendMessage(session.websocket, {
          type: 'quota_warning',
          sessionId,
          warning: {
            type: warning.type,
            remaining: warning.remaining,
            message: warning.message
          },
          timestamp: Date.now()
        });

        console.log(`⚠️  Sent ${warning.type} warning to session ${sessionId}: ${warning.message}`);
      }
    }
  }

  // Called when session quota is exhausted
  async terminateSession(sessionId: string, reason: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🛑 Terminating session ${sessionId}: ${reason}`);

    // Send termination notice
    this.sendMessage(session.websocket, {
      type: 'session_terminated',
      sessionId,
      reason,
      timestamp: Date.now()
    });

    // Close connection after a brief delay
    setTimeout(() => {
      session.websocket.close(4004, reason);
      this.sessions.delete(sessionId);
    }, 1000);
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('📡 Error sending WebSocket message:', error);
      }
    }
  }

  private cleanupStaleConnections() {
    const now = Date.now();
    const staleThreshold = now - this.HEARTBEAT_TIMEOUT;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastHeartbeat < staleThreshold) {
        console.log(`🧹 Cleaning up stale WebSocket connection for session ${sessionId}`);
        session.websocket.close(4005, 'Connection timeout');
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get active session count for monitoring
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // Get session info for debugging
  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      quotaRemaining: session.quotaRemaining,
      lastHeartbeat: session.lastHeartbeat,
      warningsSent: Array.from(session.warningsSent),
      connected: session.websocket.readyState === WebSocket.OPEN
    };
  }

  async shutdown() {
    console.log('🛑 Shutting down WebSocket monitor...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all active connections
    for (const [sessionId, session] of this.sessions.entries()) {
      this.sendMessage(session.websocket, {
        type: 'server_shutdown',
        message: 'Server is shutting down',
        timestamp: Date.now()
      });
      session.websocket.close(4006, 'Server shutdown');
    }

    this.sessions.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('✅ WebSocket monitor shut down');
  }
}

export const websocketMonitor = new WebSocketMonitor();