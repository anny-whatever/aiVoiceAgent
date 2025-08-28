import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { SessionToken, TOKEN_CONFIG } from '../types/usage';

class TokenManager {
  private secretKey: string;
  private algorithm: jwt.Algorithm = 'HS256';

  constructor() {
    // Use environment variable or generate a secure random key
    this.secretKey = process.env.JWT_SECRET || this.generateSecretKey();
    
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET not set in environment, using generated key (sessions will not persist across restarts)');
    }
  }

  private generateSecretKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Creates a new session token with time-based expiration
   */
  createSessionToken(userId: string, sessionId: string, quotaSeconds: number, ipAddress?: string): { token: string; sessionToken: SessionToken } {
    const now = Date.now();
    const expiresAt = now + (quotaSeconds * 1000); // Convert seconds to milliseconds
    
    const payload = {
      userId,
      sessionId,
      quotaSeconds,
      issuedAt: now,
      expiresAt,
      ipAddress,
      // Add some entropy to prevent token prediction
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const token = jwt.sign(payload, this.secretKey, {
      algorithm: this.algorithm,
      expiresIn: `${quotaSeconds}s`, // JWT library expiration as backup
      issuer: 'aiVoiceAgent',
      audience: 'realtime-session',
    });

    const sessionToken: SessionToken = {
      userId,
      sessionId,
      quotaRemaining: quotaSeconds,
      issuedAt: now,
      expiresAt,
    };

    return {
      token,
      sessionToken,
    };
  }

  /**
   * Verifies and decodes a session token
   */
  verifySessionToken(token: string): SessionToken | null {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        algorithms: [this.algorithm],
        issuer: 'aiVoiceAgent',
        audience: 'realtime-session',
      }) as any;

      // Additional time validation (beyond JWT's built-in expiration)
      const now = Date.now();
      if (decoded.expiresAt && decoded.expiresAt < now) {
        return null; // Token has expired
      }

      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        quotaRemaining: decoded.quotaSeconds,
        issuedAt: decoded.issuedAt,
        expiresAt: decoded.expiresAt,
      };
    } catch (error) {
      // Token is invalid, expired, or malformed
      return null;
    }
  }

  /**
   * Checks if a token is expired
   */
  isTokenExpired(token: SessionToken): boolean {
    return Date.now() > token.expiresAt;
  }

  /**
   * Gets remaining time in seconds for a token
   */
  getRemainingTime(token: SessionToken): number {
    const remaining = Math.max(0, token.expiresAt - Date.now());
    return Math.floor(remaining / 1000); // Convert to seconds
  }

  /**
   * Creates a refresh token for extending session time
   */
  createRefreshToken(originalToken: SessionToken, additionalSeconds: number): { token: string; sessionToken: SessionToken } {
    const now = Date.now();
    const newExpiresAt = now + (additionalSeconds * 1000);
    
    return this.createSessionToken(
      originalToken.userId,
      originalToken.sessionId,
      additionalSeconds
    );
  }

  /**
   * Extracts user ID from token without full verification (for logging/debugging)
   */
  extractUserIdUnsafe(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Validates token format without cryptographic verification
   */
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check if each part is valid base64
    try {
      parts.forEach(part => {
        Buffer.from(part, 'base64url');
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a heartbeat token for AI tool calls
   */
  createHeartbeatToken(sessionToken: SessionToken): string {
    const payload = {
      type: 'heartbeat',
      sessionId: sessionToken.sessionId,
      userId: sessionToken.userId,
      timestamp: Date.now(),
    };

    return jwt.sign(payload, this.secretKey, {
      algorithm: this.algorithm,
      expiresIn: '5m', // Heartbeat tokens are short-lived
      issuer: 'aiVoiceAgent',
      audience: 'heartbeat',
    });
  }

  /**
   * Verifies a heartbeat token
   */
  verifyHeartbeatToken(token: string): { sessionId: string; userId: string; timestamp: number } | null {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        algorithms: [this.algorithm],
        issuer: 'aiVoiceAgent',
        audience: 'heartbeat',
      }) as any;

      if (decoded.type !== 'heartbeat') {
        return null;
      }

      return {
        sessionId: decoded.sessionId,
        userId: decoded.userId,
        timestamp: decoded.timestamp,
      };
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();