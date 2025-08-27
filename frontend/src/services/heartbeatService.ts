import { ApiService } from './api';
import { websocketService } from './websocket';

class HeartbeatService {
  private intervalId: number | null = null;
  private sessionStartTime: number | null = null;
  private isActive = false;
  private sessionToken: string | null = null;
  private onSessionTerminated?: () => void;

  constructor() {
    // Listen for quota exceeded events from WebSocket
    // Note: WebSocket callbacks will be handled in the main app component
  }

  start(sessionToken: string, onSessionTerminated?: () => void) {
    if (this.isActive) {
      console.warn('Heartbeat service is already active');
      return;
    }

    this.sessionToken = sessionToken;
    this.sessionStartTime = Date.now();
    this.isActive = true;
    this.onSessionTerminated = onSessionTerminated;

    // Send initial heartbeat immediately
    this.sendHeartbeat();

    // Set up interval to send heartbeat every 60 seconds
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, 60000); // 60 seconds

    console.log('Heartbeat service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isActive = false;
    this.sessionStartTime = null;
    this.sessionToken = null;
    this.onSessionTerminated = undefined;
    
    console.log('Heartbeat service stopped');
  }

  private async sendHeartbeat() {
    if (!this.isActive || !this.sessionToken || !this.sessionStartTime) {
      return;
    }

    try {
      const quotaUsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      
      await ApiService.sendHeartbeat({
        quotaUsed,
        timestamp: Date.now(),
        sessionToken: this.sessionToken
      });

      // Response handling is done via WebSocket messages
      // The backend will send quota updates and termination signals via WebSocket
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
      
      // If heartbeat fails multiple times, we might want to terminate the session
      // For now, we'll just log the error and continue
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }
}

// Export singleton instance
export const heartbeatService = new HeartbeatService();
export default heartbeatService;