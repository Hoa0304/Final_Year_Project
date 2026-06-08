import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { supabase } from '../utils/supabase';

/**
 * Extend Express Request to include user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Optional authentication middleware - verifies JWT token if provided
 * Adds user information to request object if token is valid
 * Does not return error if no token provided (allows unauthenticated access)
 */
export async function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    // If no token provided, continue without user (for unauthenticated access)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    // If token is invalid, continue without user (don't block request)
    if (!decoded) {
      console.log('[optionalAuthenticate] Invalid or expired token, continuing without user');
      return next();
    }

    // Verify user still exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    // If user not found, continue without user (don't block request)
    if (error || !user) {
      console.log('[optionalAuthenticate] User not found, continuing without user');
      return next();
    }

    // Attach user to request if token is valid
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('[optionalAuthenticate] Error:', error);
    // Continue without user on error (don't block request)
    next();
  }
}

/**
 * Authentication middleware - verifies JWT token
 * Adds user information to request object if token is valid
 * Returns 401 error if no token or invalid token
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify user still exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Authorization middleware - checks if user has admin_vendor role
 * Must be used after authenticate middleware
 */
export function requireAdminVendor(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Authorization middleware - checks if user has admin_client role
 * Must be used after authenticate middleware
 */
export function requireAdminClient(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Authorization middleware - checks if user has any admin role
 * Must be used after authenticate middleware
 */
export function requireAnyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Authorization middleware - checks if user has admin role (SuperAdmin or specific admins)
 * Keep for backward compatibility, mapped to requireAnyAdmin or specific
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireAnyAdmin(req, res, next);
}

/**
 * Authorization middleware - checks if user has vendor role
 * Must be used after authenticate middleware
 */
export function requireVendor(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Vendor or Admin access required' });
  }

  next();
}

/**
 * Authorization middleware - checks if user has admin or vendor role
 * Must be used after authenticate middleware
 */
export function requireAdminOrVendor(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAuthorized = ['admin', 'vendor'].includes(req.user.role);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Admin or Vendor access required' });
  }

  next();
}
