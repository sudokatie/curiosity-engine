/**
 * Curiosity Engine API Server
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { getConfig } from '../config.js';
import { seedsRouter } from './routes/seeds.js';
import { threadsRouter } from './routes/threads.js';
import { discoveriesRouter } from './routes/discoveries.js';
import { graphRouter } from './routes/graph.js';
import { exploreRouter, setWebSocketBroadcast } from './routes/explore.js';
import { configRouter } from './routes/config.js';

const PORT = process.env.PORT || 3333;

export async function startServer(): Promise<void> {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api/seeds', seedsRouter);
  app.use('/api/threads', threadsRouter);
  app.use('/api/discoveries', discoveriesRouter);
  app.use('/api/graph', graphRouter);
  app.use('/api/explore', exploreRouter);
  app.use('/api/config', configRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

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
    console.log(`[Server] Listening on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket on ws://localhost:${PORT}/ws`);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}
