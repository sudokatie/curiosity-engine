/**
 * Graph API Routes
 */

import { Router } from 'express';
import { getConfig } from '../../config.js';
import { SeedManager } from '../../seeds/seed_manager.js';
import { ThreadPool } from '../../threads/thread_pool.js';
import { Journal } from '../../journal/journal.js';

export const graphRouter = Router();

interface GraphNode {
  id: string;
  type: 'seed' | 'thread' | 'discovery';
  label: string;
  score: number;
  status: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'explored' | 'discovered' | 'spawned';
}

// Get full graph data
graphRouter.get('/', async (req, res) => {
  try {
    const config = getConfig();
    const seeds = new SeedManager(config.data_dir);
    const threads = new ThreadPool(config.data_dir);
    const journal = new Journal(config.data_dir);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add seeds
    const seedList = await seeds.list();
    for (const seed of seedList) {
      nodes.push({
        id: seed.id,
        type: 'seed',
        label: seed.content.slice(0, 50),
        score: seed.priority,
        status: seed.status,
      });
    }

    // Add threads
    const threadList = await threads.list();
    for (const thread of threadList) {
      nodes.push({
        id: thread.id,
        type: 'thread',
        label: thread.url.slice(0, 50),
        score: thread.interestingness_score || 0.5,
        status: thread.status,
      });

      // Edge from session/seed to thread (via source_session_id)
      if (thread.source_session_id) {
        edges.push({
          id: `session-${thread.source_session_id}-${thread.id}`,
          source: thread.source_session_id,
          target: thread.id,
          type: 'explored',
        });
      }
    }

    // Add discoveries
    const discoveryList = await journal.list({});
    for (const discovery of discoveryList) {
      nodes.push({
        id: discovery.id,
        type: 'discovery',
        label: discovery.title,
        score: discovery.significance,
        status: 'discovered',
      });

      // Edge from session to discovery
      if (discovery.session_id) {
        edges.push({
          id: `${discovery.session_id}-${discovery.id}`,
          source: discovery.session_id,
          target: discovery.id,
          type: 'discovered',
        });
      }

      // Also link to the first seed in the path if available
      if (discovery.seed_path && discovery.seed_path.length > 0) {
        edges.push({
          id: `seed-${discovery.seed_path[0]}-${discovery.id}`,
          source: discovery.seed_path[0],
          target: discovery.id,
          type: 'discovered',
        });
      }
    }

    res.json({ nodes, edges });
  } catch (error) {
    console.error('[API] Error getting graph:', error);
    res.status(500).json({ error: 'Failed to get graph' });
  }
});

// Expand a specific node
graphRouter.get('/expand/:id', async (req, res) => {
  try {
    // For now, just return empty expansion
    res.json({ nodes: [], edges: [] });
  } catch (error) {
    console.error('[API] Error expanding node:', error);
    res.status(500).json({ error: 'Failed to expand node' });
  }
});
