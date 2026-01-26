/**
 * Curiosity Engine API Server
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getConfig } from '../config.js';
import { seedsRouter } from './routes/seeds.js';
import { threadsRouter } from './routes/threads.js';
import { discoveriesRouter } from './routes/discoveries.js';
import { graphRouter } from './routes/graph.js';
import { exploreRouter, setWebSocketBroadcast } from './routes/explore.js';
import { configRouter } from './routes/config.js';
import { authRouter } from './routes/auth.js';
import { feedbackRouter } from './routes/feedback.js';
import { requireAuth, rateLimit, contentFilter } from './middleware/auth.js';
import { getDatabase, cleanOldRateLimits } from './db.js';

const PORT = process.env.PORT || 3333;
const SESSION_SECRET = process.env.SESSION_SECRET || 'curiosity-engine-dev-secret-change-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function startServer(): Promise<void> {
  const app = express();
  const server = createServer(app);
  const config = getConfig();

  // Ensure data directory exists
  if (!existsSync(config.data_dir)) {
    mkdirSync(config.data_dir, { recursive: true });
  }

  // Initialize database
  getDatabase();

  // Clean old rate limit records periodically
  setInterval(() => {
    cleanOldRateLimits();
  }, 60 * 60 * 1000); // Every hour

  // Trust proxy in production (behind nginx)
  if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
  }

  // CORS configuration
  app.use(cors({
    origin: IS_PRODUCTION 
      ? ['https://blackabee.com', 'https://www.blackabee.com']
      : ['http://localhost:5173', 'http://localhost:3333'],
    credentials: true,
  }));

  // Body parsing
  app.use(express.json());

  // Session middleware
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'curiosity.sid',
    cookie: {
      secure: IS_PRODUCTION,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    },
  }));

  // Public routes (no auth required)
  app.use('/api/auth', authRouter);

  // Health check (public)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', auth: 'enabled' });
  });

  // Protected routes (auth required)
  app.use('/api/seeds', requireAuth, seedsRouter);
  app.use('/api/threads', requireAuth, threadsRouter);
  app.use('/api/discoveries', requireAuth, discoveriesRouter);
  app.use('/api/graph', requireAuth, graphRouter);
  app.use('/api/config', requireAuth, configRouter);
  app.use('/api/feedback', feedbackRouter);
  
  // Explore route with additional guardrails
  app.use('/api/explore', 
    requireAuth, 
    contentFilter,
    rateLimit('exploration', 10), // Max 10 explorations per day
    exploreRouter
  );

  // Serve static files in production
  if (IS_PRODUCTION) {
    const staticPath = join(process.cwd(), 'web', 'dist');
    if (existsSync(staticPath)) {
      app.use(express.static(staticPath));
      
      // SPA fallback - use regex pattern instead of *
      app.get(/^\/(?!api).*/, (_req, res) => {
        res.sendFile(join(staticPath, 'index.html'));
      });
    }
  }

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });
  });

  // Set up broadcast function for exploration events
  setWebSocketBroadcast((event) => {
    const message = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`[Server] Curiosity Engine listening on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket on ws://localhost:${PORT}/ws`);
    console.log(`[Server] Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
    console.log(`[Server] Auth: enabled`);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}
