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

const BACKEND_URL = import.meta.env.VITE_BACKEND || "http://localhost:3001";

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onQuotaUpdate?: (remaining: number) => void;
  private onQuotaWarning?: (warning: QuotaWarning) => void;
  private onSessionTerminated?: (reason: string) => void;

  private getWebSocketUrl(): string {
    try {
      const url = new URL(BACKEND_URL);
      // Convert HTTP protocol to WebSocket protocol
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}`;
    } catch (error) {
      // Fallback for invalid URLs or relative paths
      console.warn('Invalid BACKEND_URL, using fallback:', error);
      return BACKEND_URL.replace(/^https?:\/\//, '').replace(/^/, 'ws://');
    }
  }

  connect(callbacks: {
    onQuotaUpdate?: (remaining: number) => void;
    onQuotaWarning?: (warning: QuotaWarning) => void;
    onSessionTerminated?: (reason: string) => void;
  }) {
    // Clean up existing connection first
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
      this.ws = null;
    }

    this.onQuotaUpdate = callbacks.onQuotaUpdate;
    this.onQuotaWarning = callbacks.onQuotaWarning;
    this.onSessionTerminated = callbacks.onSessionTerminated;

    const sessionToken = ApiService.getSessionManager().getSessionToken();
    if (!sessionToken) {
      console.warn('No session token available for WebSocket connection');
      return;
    }

    try {
      const wsBaseUrl = this.getWebSocketUrl();
      const wsUrl = `${wsBaseUrl}/ws/monitor?token=${encodeURIComponent(sessionToken)}`;
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

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

    // Don't reconnect if already connected or connecting
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
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