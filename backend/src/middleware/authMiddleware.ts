import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

export interface AuthenticatedRequest extends Request {
  firebase_uid?: string;
  user?: any;
}

/**
 * Middleware to validate API key and extract Firebase UID from query parameters
 * API key is used for authentication, UID is used for user-specific database queries
 */
export const extractFirebaseUid = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract API key and UID from query parameters
    const apiKey = req.query.api as string;
    const firebase_uid = req.query.uid as string;

    // Validate API key is present
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key is required',
        message: 'Please provide api key in query parameters: ?api=your_api_key'
      });
    }

    // Validate Firebase UID is present
    if (!firebase_uid) {
      return res.status(401).json({
        error: 'Firebase UID is required',
        message: 'Please provide firebase UID in query parameters: ?uid=your_firebase_uid'
      });
    }

    // TODO: Add proper API key validation here
    // For now, we just check if it exists
    // In production, validate against your API key store/database
    
    // Validate that the user exists in our database
    const userExists = await UserService.userExists(firebase_uid);
    if (!userExists) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with firebase_uid: ${firebase_uid}`
      });
    }

    req.firebase_uid = firebase_uid;
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

// Rate limiting middleware removed

/**
 * Input validation middleware
 */
export const validateTripData = (req: Request, res: Response, next: NextFunction) => {
  const { tripData } = req.body;
  
  if (!tripData) {
    return next(); // Optional validation
  }
  
  const requiredFields = ['startLat', 'startLong', 'startAddress', 'endLat', 'endLong', 'endAddress', 'start_time'];
  const missingFields = requiredFields.filter(field => !tripData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Invalid trip data',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      requiredFields
    });
  }
  
  // Validate coordinates
  if (typeof tripData.startLat !== 'number' || typeof tripData.startLong !== 'number' ||
      typeof tripData.endLat !== 'number' || typeof tripData.endLong !== 'number') {
    return res.status(400).json({
      error: 'Invalid coordinates',
      message: 'Latitude and longitude must be valid numbers'
    });
  }
  
  // Validate coordinate ranges
  if (Math.abs(tripData.startLat) > 90 || Math.abs(tripData.endLat) > 90) {
    return res.status(400).json({
      error: 'Invalid latitude',
      message: 'Latitude must be between -90 and 90 degrees'
    });
  }
  
  if (Math.abs(tripData.startLong) > 180 || Math.abs(tripData.endLong) > 180) {
    return res.status(400).json({
      error: 'Invalid longitude',
      message: 'Longitude must be between -180 and 180 degrees'
    });
  }
  
  // Validate start_time format
  const startTime = new Date(tripData.start_time);
  if (isNaN(startTime.getTime())) {
    return res.status(400).json({
      error: 'Invalid start_time format',
      message: 'start_time must be a valid ISO date string',
      provided: tripData.start_time
    });
  }
  
  // Validate optional boolean fields if provided
  const booleanFields = ['is_first_drive_today', 'is_weekend_drive', 'is_night_drive', 'is_morning_commute'];
  for (const field of booleanFields) {
    if (tripData[field] !== undefined && typeof tripData[field] !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid boolean field',
        message: `${field} must be a boolean value`,
        provided: tripData[field]
      });
    }
  }
  
  // Validate status if provided
  if (tripData.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(tripData.status)) {
    return res.status(400).json({
      error: 'Invalid status',
      message: 'Status must be one of: pending, in_progress, completed, cancelled',
      provided: tripData.status
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