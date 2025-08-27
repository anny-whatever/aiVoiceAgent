import { ApiResponse, User, SessionInfo } from "../types";

const BACKEND_URL = "http://localhost:3001";

class SessionManager {
  private sessionToken: string | null = null;
  private quotaRemaining: number = 0;
  private sessionTimeLimit: number = 0;
  private warningThreshold: number = 0;

  setSession(sessionInfo: SessionInfo) {
    this.sessionToken = sessionInfo.sessionToken;
    this.quotaRemaining = sessionInfo.quotaRemaining;
    this.sessionTimeLimit = sessionInfo.sessionTimeLimit;
    this.warningThreshold = sessionInfo.warningThreshold;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  getQuotaStatus() {
    const percentage = this.sessionTimeLimit > 0 ? (this.quotaRemaining / this.sessionTimeLimit) * 100 : 0;
    return {
      remaining: this.quotaRemaining,
      total: this.sessionTimeLimit,
      percentage,
      isWarning: this.quotaRemaining <= this.warningThreshold,
      isCritical: this.quotaRemaining <= this.warningThreshold * 0.5,
    };
  }

  updateQuota(remaining: number) {
    this.quotaRemaining = remaining;
  }

  clearSession() {
    this.sessionToken = null;
    this.quotaRemaining = 0;
    this.sessionTimeLimit = 0;
    this.warningThreshold = 0;
  }
}

const sessionManager = new SessionManager();

export class ApiService {
  static async createSession(userId: string): Promise<{ apiKey: string; sessionInfo: SessionInfo }> {
    const response = await fetch(`${BACKEND_URL}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Session create failed");
    }

    const data = await response.json();
    const sessionInfo: SessionInfo = {
      sessionToken: data.sessionToken,
      quotaRemaining: data.quotaRemaining,
      sessionTimeLimit: data.sessionTimeLimit,
      warningThreshold: data.warningThreshold,
    };
    
    sessionManager.setSession(sessionInfo);
    return { apiKey: data.apiKey, sessionInfo };
  }

  static async getUsers(): Promise<User[]> {
    const response = await fetch(`${BACKEND_URL}/api/users`);
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    return response.json();
  }

  static getSessionManager() {
    return sessionManager;
  }

  private static getAuthHeaders() {
    const token = sessionManager.getSessionToken();
    return {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
    };
  }

  static async getDrivingData(args: any): Promise<ApiResponse> {
    const response = await fetch(`${BACKEND_URL}/api/tools/get_driving_data`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  static async assessUserMood(args: any): Promise<ApiResponse> {
    const response = await fetch(`${BACKEND_URL}/api/tools/assess_user_mood`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

export { BACKEND_URL };
