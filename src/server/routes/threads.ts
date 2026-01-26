/**
 * Threads API Routes
 */

import { Router } from 'express';
import { getConfig } from '../../config.js';
import { ThreadPool } from '../../threads/thread_pool.js';

export const threadsRouter = Router();

function getThreadPool() {
  const config = getConfig();
  return new ThreadPool(config.data_dir);
}

// List threads
threadsRouter.get('/', async (req, res) => {
  try {
    const threads = getThreadPool();
    const list = await threads.list();
    res.json(list);
  } catch (error) {
    console.error('[API] Error listing threads:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

// Get thread by ID
threadsRouter.get('/:id', async (req, res) => {
  try {
    const threads = getThreadPool();
    const list = await threads.list();
    const thread = list.find(t => t.id === req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(thread);
  } catch (error) {
    console.error('[API] Error getting thread:', error);
    res.status(500).json({ error: 'Failed to get thread' });
  }
});

// Update thread
threadsRouter.patch('/:id', async (req, res) => {
  try {
    const threads = getThreadPool();
    const list = await threads.list();
    const thread = list.find(t => t.id === req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    // Thread pool doesn't have update method in the current impl
    res.json(thread);
  } catch (error) {
    console.error('[API] Error updating thread:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});
