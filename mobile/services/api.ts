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

  private getApiQueryParams(): string {
    // Get API key and UID from environment or config
    const apiKey = process.env.API_KEY || '5a0fe6a5eb768c1bb43999b8aa56a7cf';
    const uid = process.env.UID || '0RzeMsFE8EdpQSAFnh70VeyLnIr2';
    return `api=${apiKey}&uid=${uid}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Add query parameters to the endpoint
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${separator}${this.getApiQueryParams()}`;
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

  async createSession(apiKey: string, uid?: string): Promise<{ openaiApiKey: string; sessionInfo: SessionInfo }> {
    const response = await this.makeRequest('/api/session', {
      method: 'POST',
      body: JSON.stringify({ userId: uid }),
    });

    this.sessionManager.setSessionToken(response.sessionToken);
    
    // Convert backend response to QuotaStatus format
    const quotaStatus: QuotaStatus = {
      remaining: response.quotaRemaining || 0,
      total: response.sessionTimeLimit || 0,
      percentage: response.sessionTimeLimit > 0 ? (response.quotaRemaining / response.sessionTimeLimit) * 100 : 0,
      isWarning: response.quotaRemaining <= (response.warningThreshold || 0),
      isCritical: response.quotaRemaining <= (response.warningThreshold || 0) * 0.5,
    };
    
    this.sessionManager.setQuota(quotaStatus);
    
    const sessionInfo: SessionInfo = {
      sessionToken: response.sessionToken,
      quotaRemaining: response.quotaRemaining,
      sessionTimeLimit: response.sessionTimeLimit,
      warningThreshold: response.warningThreshold,
    };
    
    return { openaiApiKey: response.apiKey, sessionInfo };
  }

  async getDrivingData(): Promise<any> {
    return await this.makeRequest('/api/tools/get_driving_data', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async assessUserMood(transcript: string, audioData?: string): Promise<{ assessment: MoodAssessment; instructions: string; content: string }> {
    // Ensure transcript is always a string to prevent backend substring errors
    const userResponse = typeof transcript === 'string' ? transcript : String(transcript || '');
    
    return await this.makeRequest('/api/tools/assess_user_mood', {
      method: 'POST',
      body: JSON.stringify({ userResponse, sessionId: this.sessionManager.getSessionToken() }),
    });
  }

  async getVehicleInfo(): Promise<any> {
    return await this.makeRequest('/api/tools/get_vehicle_info', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getUserInfo(): Promise<User> {
    return await this.makeRequest('/api/tools/get_user_info', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async sendHeartbeat(timestamp: number): Promise<void> {
    const sessionToken = this.sessionManager.getSessionToken();
    if (!sessionToken) {
      throw new Error('No session token available for heartbeat');
    }
    
    await this.makeRequest('/api/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, timestamp }),
    });
  }

  async searchWeb(query: string): Promise<any> {
    return await this.makeRequest('/api/tools/search_web', {
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