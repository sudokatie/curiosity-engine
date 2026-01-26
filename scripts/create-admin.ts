/**
 * Create admin user script
 * Usage: npx tsx scripts/create-admin.ts <email> <password>
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { join } from 'path';

const SALT_ROUNDS = 12;

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password>');
    process.exit(1);
  }

  const dbPath = join(process.cwd(), 'data', 'curiosity.db');
  const db = new Database(dbPath);

  // Ensure table exists with is_admin column
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      is_admin INTEGER NOT NULL DEFAULT 0
    )
  `);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const stmt = db.prepare(
      'INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, 1)'
    );
    const result = stmt.run(email.toLowerCase(), passwordHash);
    console.log(`Admin user created: ${email} (ID: ${result.lastInsertRowid})`);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Update existing user to admin
      const updateStmt = db.prepare(
        'UPDATE users SET is_admin = 1, password_hash = ? WHERE email = ?'
      );
      updateStmt.run(passwordHash, email.toLowerCase());
      console.log(`User ${email} upgraded to admin`);
    } else {
      throw error;
    }
  }

  db.close();
}

createAdmin().catch(console.error);
