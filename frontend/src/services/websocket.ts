import { ApiService } from "./api";

interface QuotaUpdate {
  type: 'quota_update';
  quotaRemaining: number;
}

interface QuotaWarning {
  type: 'quota_warning';
  remaining: number;
  message: string;
}

interface SessionTermination {
  type: 'session_terminated';
  reason: string;
}

type WebSocketMessage = QuotaUpdate | QuotaWarning | SessionTermination;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onQuotaUpdate?: (remaining: number) => void;
  private onQuotaWarning?: (warning: QuotaWarning) => void;
  private onSessionTerminated?: (reason: string) => void;

  connect(callbacks: {
    onQuotaUpdate?: (remaining: number) => void;
    onQuotaWarning?: (warning: QuotaWarning) => void;
    onSessionTerminated?: (reason: string) => void;
  }) {
    this.onQuotaUpdate = callbacks.onQuotaUpdate;
    this.onQuotaWarning = callbacks.onQuotaWarning;
    this.onSessionTerminated = callbacks.onSessionTerminated;

    const sessionToken = ApiService.getSessionManager().getSessionToken();
    if (!sessionToken) {
      console.warn('No session token available for WebSocket connection');
      return;
    }

    try {
      this.ws = new WebSocket(`ws://localhost:3001?token=${encodeURIComponent(sessionToken)}`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'quota_update':
        ApiService.getSessionManager().updateQuota(message.quotaRemaining);
        this.onQuotaUpdate?.(message.quotaRemaining);
        break;
      
      case 'quota_warning':
        this.onQuotaWarning?.(message);
        break;
      
      case 'session_terminated':
        this.onSessionTerminated?.(message.reason);
        this.disconnect();
        break;
      
      default:
        console.warn('Unknown WebSocket message type:', message);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect({
        onQuotaUpdate: this.onQuotaUpdate,
        onQuotaWarning: this.onQuotaWarning,
        onSessionTerminated: this.onSessionTerminated,
      });
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export type { QuotaWarning, SessionTermination };