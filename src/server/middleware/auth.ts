/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { getActionCount, recordAction } from '../db.js';

// Extend Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userEmail?: string;
    }
  }
}

/**
 * Require authentication for a route
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.userId = req.session.userId;
  req.userEmail = req.session.email;
  next();
}

/**
 * Rate limiting middleware
 */
export function rateLimit(action: string, maxPerDay: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const count = getActionCount(req.session.userId, action, 24);
    
    if (count >= maxPerDay) {
      res.status(429).json({ 
        error: `Rate limit exceeded. Maximum ${maxPerDay} ${action} actions per day.`,
        limit: maxPerDay,
        used: count,
        resets_in: '24 hours',
      });
      return;
    }

    // Record this action
    recordAction(req.session.userId, action);
    next();
  };
}

/**
 * Content filter middleware - blocks harmful exploration topics
 */
const BLOCKED_PATTERNS = [
  // Illegal content
  /child\s*(porn|abuse|exploitation)/i,
  /how\s+to\s+(make|build|create)\s+(bomb|explosive|weapon)/i,
  /buy\s+(drugs|illegal|stolen)/i,
  /hire\s+(hitman|assassin|killer)/i,
  
  // Harmful content
  /suicide\s+(methods|how\s+to)/i,
  /self[- ]harm\s+(methods|how\s+to)/i,
  
  // Scams and fraud
  /how\s+to\s+(scam|defraud|steal\s+identity)/i,
  /credit\s+card\s+fraud/i,
  /phishing\s+(kit|tutorial)/i,
];

export function contentFilter(req: Request, res: Response, next: NextFunction): void {
  const content = req.body.content || req.body.query || req.body.seed || '';
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      console.log(`[ContentFilter] Blocked content from user ${req.session.userId}: matched pattern`);
      res.status(400).json({ 
        error: 'This exploration topic is not allowed.',
        reason: 'Content policy violation',
      });
      return;
    }
  }
  
  next();
}

/**
 * Resource limit middleware - checks user's resource usage
 */
export function resourceLimit(resource: string, maxCount: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // This will be implemented with per-user storage
    // For now, just pass through
    next();
  };
}
