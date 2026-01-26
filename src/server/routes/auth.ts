/**
 * Authentication Routes
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { createUser, getUserByEmail, getUserById, getUserCount } from '../db.js';

const SALT_ROUNDS = 12;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const MIN_PASSWORD_LENGTH = 8;

export const authRouter = Router();

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: number;
    email: string;
  }
}

// Signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ 
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` 
      });
    }

    // Check if email already exists
    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = createUser(email, passwordHash);

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;

    console.log(`[Auth] New user registered: ${user.email} (ID: ${user.id})`);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Signup error:', error.message);
    
    if (error.message === 'User limit reached. Early access is currently full.') {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;

    console.log(`[Auth] User logged in: ${user.email}`);

    res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const email = req.session.email;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    console.log(`[Auth] User logged out: ${email}`);
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
authRouter.get('/me', (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
  });
});

// Get system status (public)
authRouter.get('/status', (_req: Request, res: Response) => {
  const userCount = getUserCount();
  const maxUsers = 100;
  
  res.json({
    users_registered: userCount,
    max_users: maxUsers,
    slots_available: maxUsers - userCount,
    accepting_signups: userCount < maxUsers,
  });
});
