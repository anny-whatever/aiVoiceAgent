import { User, MoodAssessment, QuotaStatus, SessionInfo } from '../types';

class SessionManager {
  private sessionToken: string | null = null;
  private quota: QuotaStatus = {
    remaining: 1000,
    total: 1000,
    percentage: 100,
    isWarning: false,
    isCritical: false
  };

  setSessionToken(token: string) {
    this.sessionToken = token;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  setQuota(quota: QuotaStatus) {
    this.quota = quota;
  }

  getQuota(): QuotaStatus {
    return this.quota;
  }

  clearSession() {
    this.sessionToken = null;
    this.quota = {
      remaining: 1000,
      total: 1000,
      percentage: 100,
      isWarning: false,
      isCritical: false
    };
  }
}

class ApiService {
  private static instance: ApiService;
  private sessionManager: SessionManager;
  private baseUrl: string;

  private constructor() {
    this.sessionManager = new SessionManager();
    // Use environment variable or default to localhost
    this.baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const sessionToken = this.sessionManager.getSessionToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async createSession(apiKey: string, uid?: string): Promise<SessionInfo> {
    const response = await this.makeRequest('/api/session', {
      method: 'POST',
      body: JSON.stringify({ apiKey, uid }),
    });

    this.sessionManager.setSessionToken(response.sessionToken);
    this.sessionManager.setQuota(response.quota);
    
    return response;
  }

  async getDrivingData(): Promise<any> {
    return await this.makeRequest('/api/driving-data', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async assessUserMood(transcript: string, audioData?: string): Promise<MoodAssessment> {
    return await this.makeRequest('/api/assess-mood', {
      method: 'POST',
      body: JSON.stringify({ transcript, audioData }),
    });
  }

  async getVehicleInfo(): Promise<any> {
    return await this.makeRequest('/api/vehicle-info', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getUserInfo(): Promise<User> {
    return await this.makeRequest('/api/user-info', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async sendHeartbeat(timestamp: number): Promise<void> {
    await this.makeRequest('/api/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ timestamp }),
    });
  }

  async searchWeb(query: string): Promise<any> {
    return await this.makeRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}

export default ApiService.getInstance();
export { SessionManager };