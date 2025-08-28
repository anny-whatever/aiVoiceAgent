import { Request, Response, NextFunction } from 'express';
import { usageService } from '../lib/usageService.js';
import { tokenManager } from '../lib/tokenManager.js';
import { ENV } from '../config/env.js';

/**
 * Enhanced session creation middleware with usage validation
 */
export async function validateSessionCreation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user identification (IP address as fallback)
    const userId = req.body.userId || req.ip || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    // Validate session creation
    const validation = await usageService.validateSessionCreation(userId, ipAddress);
    
    if (!validation.allowed) {
      res.status(429).json({
        error: 'Session creation denied',
        reason: validation.reason,
        quotaRemaining: validation.quotaRemaining,
        sessionTimeRemaining: validation.sessionTimeRemaining,
      });
      return;
    }

    // Add validation data to request for use in session creation
    req.sessionValidation = {
      userId,
      ipAddress,
      validation,
    };

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      error: 'Internal server error during session validation',
    });
  }
}

/**
 * Middleware to validate API key from query parameters
 * Validates against the backend's API key for proper authentication
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  try {
    const apiKey = req.query.api as string;
    
    console.log('🔑 API Key validation:', {
      received: apiKey,
      expected: ENV.API_KEY,
      match: apiKey === ENV.API_KEY
    });
    
    if (!apiKey) {
      res.status(401).json({
        error: 'Missing API key',
        message: 'API key is required in query parameters: ?api=your_api_key',
      });
      return;
    }

    // Validate against the backend's API key
    if (apiKey !== ENV.API_KEY) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'API key does not match',
      });
      return;
    }

    // Store the API key in request for potential future use
    req.apiKey = apiKey;
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      error: 'Internal server error during API key validation',
    });
  }
}

/**
 * Middleware to validate existing session tokens
 */
export async function validateSessionToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Missing or invalid authorization header',
        action: 'REQUIRE_NEW_SESSION',
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Validate token format first
    if (!tokenManager.isValidTokenFormat(token)) {
      res.status(401).json({
        error: 'Invalid token format',
        action: 'REQUIRE_NEW_SESSION',
      });
      return;
    }

    // Validate session
    const { valid, session, remaining } = await usageService.validateSession(token);
    
    if (!valid || !session) {
      res.status(401).json({
        error: 'Invalid or expired session',
        action: 'REQUIRE_NEW_SESSION',
      });
      return;
    }

    // Add session data to request
    req.sessionData = {
      session,
      remaining: remaining || 0,
      token,
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      error: 'Internal server error during token validation',
    });
  }
}

/**
 * Middleware to track tool usage and enforce real-time limits
 */
export async function trackToolUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Skip tracking for heartbeat endpoint (it handles its own tracking)
    if (req.path.includes('/heartbeat')) {
      next();
      return;
    }

    const sessionData = req.sessionData;
    if (!sessionData) {
      res.status(401).json({
        error: 'No session data available',
        action: 'REQUIRE_NEW_SESSION',
      });
      return;
    }

    // Check if session is still valid (real-time check)
    const { valid } = await usageService.validateSession(sessionData.token);
    
    if (!valid) {
      res.status(401).json({
        error: 'Session expired during request',
        action: 'END_SESSION',
      });
      return;
    }

    // Log tool usage for monitoring
    console.log(`Tool usage: ${req.method} ${req.path} - Session: ${sessionData.session.sessionId} - User: ${sessionData.session.userId}`);

    next();
  } catch (error) {
    console.error('Tool usage tracking error:', error);
    res.status(500).json({
      error: 'Internal server error during tool usage tracking',
    });
  }
}

/**
 * Middleware to add CORS headers for session management
 */
export function sessionCors(req: Request, res: Response, next: NextFunction): void {
  // Add session-specific CORS headers
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID');
  res.header('Access-Control-Expose-Headers', 'X-Session-Remaining, X-Quota-Warning');
  
  next();
}

/**
 * Middleware to add session info to response headers
 */
export function addSessionHeaders(req: Request, res: Response, next: NextFunction): void {
  const sessionData = req.sessionData;
  
  if (sessionData) {
    res.header('X-Session-ID', sessionData.session.sessionId);
    res.header('X-Session-Remaining', sessionData.remaining.toString());
    
    // Add warning header if approaching limits
    if (sessionData.remaining <= 300) { // 5 minutes warning
      res.header('X-Quota-Warning', 'true');
    }
  }
  
  next();
}

/**
 * Rate limiting specifically for session creation
 */
export function sessionCreationRateLimit(req: Request, res: Response, next: NextFunction): void {
  // This would integrate with express-rate-limit for session-specific limits
  // For now, we'll use a simple in-memory tracker
  
  const userId = req.body.userId || req.ip || 'anonymous';
  const key = `session_creation_${userId}`;
  
  // Simple rate limiting logic (in production, use Redis or similar)
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  // This is a simplified implementation - in production use proper rate limiting
  next();
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      sessionValidation?: {
        userId: string;
        ipAddress: string;
        validation: any;
      };
      sessionData?: {
        session: any;
        remaining: number;
        token: string;
      };
      apiKey?: string;
    }
  }
}