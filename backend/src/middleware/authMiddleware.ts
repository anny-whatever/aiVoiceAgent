import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

export interface AuthenticatedRequest extends Request {
  firebase_uid?: string;
  user?: any;
}

/**
 * Middleware to extract and validate Firebase UID from request
 * This should be used with Firebase Admin SDK in production
 */
export const extractFirebaseUid = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // For now, we'll extract firebase_uid from request body or headers
    // In production, this should validate Firebase ID tokens
    const firebase_uid = req.body.firebase_uid || 
                        req.headers['x-firebase-uid'] || 
                        req.query.firebase_uid;

    if (!firebase_uid) {
      return res.status(401).json({
        error: 'Firebase UID is required',
        message: 'Please provide firebase_uid in request body, headers (x-firebase-uid), or query parameters'
      });
    }

    // Validate that the user exists in our database
    const userExists = await UserService.userExists(firebase_uid as string);
    if (!userExists) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with firebase_uid: ${firebase_uid}`
      });
    }

    req.firebase_uid = firebase_uid as string;
    next();
  } catch (error) {
    console.error('Error in extractFirebaseUid middleware:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to authenticate user'
    });
  }
};

/**
 * Middleware to ensure user owns the requested resource
 * This prevents users from accessing other users' data
 */
export const ensureResourceOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const requestedUserId = req.params.userId || req.body.userId || req.query.userId;
  
  if (requestedUserId && requestedUserId !== req.firebase_uid) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own data'
    });
  }
  
  next();
};

/**
 * Rate limiting middleware for API endpoints
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

export const rateLimitByUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const firebase_uid = req.firebase_uid;
  
  if (!firebase_uid) {
    return next(); // Let other middleware handle missing auth
  }
  
  const now = Date.now();
  const userKey = `rate_limit_${firebase_uid}`;
  const userRequests = requestCounts.get(userKey);
  
  if (!userRequests || now > userRequests.resetTime) {
    // Reset or initialize counter
    requestCounts.set(userKey, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return next();
  }
  
  if (userRequests.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${RATE_LIMIT_MAX_REQUESTS} requests per minute`,
      retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
    });
  }
  
  userRequests.count++;
  next();
};

/**
 * Input validation middleware
 */
export const validateTripData = (req: Request, res: Response, next: NextFunction) => {
  const { tripData } = req.body;
  
  if (!tripData) {
    return next(); // Optional validation
  }
  
  const requiredFields = ['startLocation', 'endLocation', 'date', 'category'];
  const missingFields = requiredFields.filter(field => !tripData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Invalid trip data',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      requiredFields
    });
  }
  
  // Validate category
  const validCategories = [
    'work_commute', 'errands_shopping', 'social_visits', 
    'leisure_recreation', 'medical_appointments', 'other'
  ];
  
  if (!validCategories.includes(tripData.category)) {
    return res.status(400).json({
      error: 'Invalid category',
      message: `Category must be one of: ${validCategories.join(', ')}`,
      provided: tripData.category
    });
  }
  
  // Validate date format
  const date = new Date(tripData.date);
  if (isNaN(date.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'Date must be a valid ISO date string',
      provided: tripData.date
    });
  }
  
  next();
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic XSS protection
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };
  
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

/**
 * Error handling middleware
 */
export const handleAuthErrors = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Authentication error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid data format',
      message: 'One or more fields have invalid format'
    });
  }
  
  return res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
};