import { ApiResponse, User } from "../types";

const BACKEND_URL = "http://localhost:3001";

export class ApiService {
  static async createSession(userId: string): Promise<{ apiKey: string }> {
    const response = await fetch(`${BACKEND_URL}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Session create failed");
    }

    return response.json();
  }

  static async getUsers(): Promise<User[]> {
    const response = await fetch(`${BACKEND_URL}/api/users`);
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    return response.json();
  }

  static async getDrivingData(args: any): Promise<ApiResponse> {
    const response = await fetch(`${BACKEND_URL}/api/tools/get_driving_data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
