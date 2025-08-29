import ApiService from './api';

class HeartbeatService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isActive: boolean = false;
  private sessionStartTime: number = 0;

  start(): void {
    if (this.isActive) {
      console.warn('Heartbeat service is already running');
      return;
    }

    this.isActive = true;
    this.sessionStartTime = Date.now();
    
    // Send heartbeat every 5 seconds (changed from 60 seconds for more frequent updates)
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, 5000);

    console.log('Heartbeat service started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isActive = false;
    this.sessionStartTime = 0;
    
    console.log('Heartbeat service stopped');
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      const timestamp = Date.now();
      await ApiService.sendHeartbeat(timestamp);
      
      const sessionDuration = Math.floor((timestamp - this.sessionStartTime) / 1000);
      console.log(`Heartbeat sent - Session duration: ${sessionDuration}s`);
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
      // Don't stop the service on error, just log it
    }
  }

  getSessionDuration(): number {
    if (!this.isActive || this.sessionStartTime === 0) {
      return 0;
    }
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

export default new HeartbeatService();