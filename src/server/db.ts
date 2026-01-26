/**
 * SQLite Database for User Management and Rate Limiting
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { getConfig } from '../config.js';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const config = getConfig();
    const dbPath = join(config.data_dir, 'curiosity.db');
    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database): void {
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      is_admin INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Rate limits table
  database.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Index for rate limit queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
    ON rate_limits(user_id, action, timestamp)
  `);

  console.log('[DB] Database initialized');
}

// User operations
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
  is_active: number;
  is_admin: number;
}

export function createUser(email: string, passwordHash: string): User | null {
  const db = getDatabase();
  
  // Check user limit (max 100 users for early access)
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const { count } = countStmt.get() as { count: number };
  
  if (count >= 100) {
    throw new Error('User limit reached. Early access is currently full.');
  }
  
  try {
    const stmt = db.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    );
    const result = stmt.run(email.toLowerCase(), passwordHash);
    return getUserById(result.lastInsertRowid as number);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Email already registered');
    }
    throw error;
  }
}

export function getUserByEmail(email: string): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
  return stmt.get(email.toLowerCase()) as User | null;
}

export function getUserById(id: number): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
  return stmt.get(id) as User | null;
}

export function getUserCount(): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get() as { count: number };
  return result.count;
}

// Rate limiting operations
export function recordAction(userId: number, action: string): void {
  const db = getDatabase();
  const stmt = db.prepare(
    'INSERT INTO rate_limits (user_id, action) VALUES (?, ?)'
  );
  stmt.run(userId, action);
}

export function getActionCount(userId: number, action: string, sinceHours: number = 24): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM rate_limits 
    WHERE user_id = ? AND action = ? 
    AND timestamp > datetime('now', '-' || ? || ' hours')
  `);
  const result = stmt.get(userId, action, sinceHours) as { count: number };
  return result.count;
}

export function cleanOldRateLimits(): void {
  const db = getDatabase();
  // Delete rate limit records older than 7 days
  const stmt = db.prepare(`
    DELETE FROM rate_limits 
    WHERE timestamp < datetime('now', '-7 days')
  `);
  stmt.run();
}

// Close database on exit
process.on('exit', () => {
  if (db) {
    db.close();
  }
});
