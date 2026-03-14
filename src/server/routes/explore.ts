/**
 * Exploration API Routes
 */

import { Router } from 'express';
import { getConfig } from '../../config.js';
import { SeedManager } from '../../seeds/seed_manager.js';
import { ThreadPool } from '../../threads/thread_pool.js';
import { Journal } from '../../journal/journal.js';
import { SourceRegistry } from '../../sources/source_registry.js';
import { WebAdapter } from '../../sources/web_adapter.js';
import { RssAdapter } from '../../sources/rss_adapter.js';
import { Evaluator } from '../../evaluator/evaluator.js';
import { Explorer } from '../../explorer/explorer.js';
import { SeedStatus } from '../../types.js';

export const exploreRouter = Router();

interface ExplorationEvent {
  type: string;
  data: Record<string, unknown>;
}

let broadcast: ((event: ExplorationEvent) => void) | null = null;
let currentExploration: { status: string; seedId: string | null } = {
  status: 'idle',
  seedId: null,
};
let abortController: AbortController | null = null;

export function setWebSocketBroadcast(fn: (event: ExplorationEvent) => void) {
  broadcast = fn;
}

// Get exploration status
exploreRouter.get('/status', (_req, res) => {
  res.json(currentExploration);
});

// Start exploration
exploreRouter.post('/', async (req, res) => {
  try {
    if (currentExploration.status === 'running') {
      return res.status(409).json({ error: 'Exploration already running' });
    }

    const config = getConfig();
    const seeds = new SeedManager(config.data_dir);
    const threads = new ThreadPool(config.data_dir);
    const journal = new Journal(config.data_dir);

    // Get seed to explore
    let seedId = req.body.seedId;
    let seed;

    if (seedId) {
      seed = await seeds.getById(seedId);
    } else {
      // Pick a random active seed
      const activeSeeds = await seeds.list(SeedStatus.ACTIVE);
      if (activeSeeds.length > 0) {
        seed = activeSeeds[Math.floor(Math.random() * activeSeeds.length)];
        seedId = seed.id;
      }
    }

    if (!seed) {
      return res.status(400).json({ error: 'No seed available to explore' });
    }

    currentExploration = { status: 'running', seedId };
    abortController = new AbortController();

    broadcast?.({ type: 'exploration:start', data: { seedId } });

    // Run exploration async
    (async () => {
      const signal = abortController?.signal;
      try {
        const sources = new SourceRegistry();
        sources.register(
          new WebAdapter(config.sources.web, {
            fetchDelayMs: config.exploration.fetch_delay_ms,
            timeoutMs: config.exploration.source_timeout_ms,
          })
        );
        
        // Register RSS adapter if configured
        if (config.sources.rss?.enabled) {
          sources.register(new RssAdapter(config.sources.rss, config.data_dir));
        }

        const evaluator = new Evaluator(config);
        const explorer = new Explorer(config, sources, evaluator, threads, journal, seeds);

        // Check if cancelled before starting
        if (signal?.aborted) {
          broadcast?.({ type: 'exploration:cancelled', data: { seedId } });
          return;
        }

        const session = await explorer.explore(seed);

        // Check if cancelled during exploration
        if (signal?.aborted) {
          broadcast?.({ type: 'exploration:cancelled', data: { seedId } });
          return;
        }

        broadcast?.({
          type: 'exploration:complete',
          data: {
            seedId,
            discoveries: session.discoveries.length,
            threads: session.new_threads.length,
          },
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          broadcast?.({ type: 'exploration:cancelled', data: { seedId } });
          return;
        }
        console.error('[Explore] Error:', error);
        broadcast?.({
          type: 'exploration:error',
          data: { error: String(error) },
        });
      } finally {
        currentExploration = { status: 'idle', seedId: null };
        abortController = null;
      }
    })();

    res.json({ status: 'started', seedId });
  } catch (error) {
    console.error('[API] Error starting exploration:', error);
    res.status(500).json({ error: 'Failed to start exploration' });
  }
});

// Cancel exploration
exploreRouter.delete('/', (_req, res) => {
  if (currentExploration.status !== 'running') {
    return res.status(400).json({ error: 'No exploration running' });
  }

  // Abort the current exploration
  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  currentExploration = { status: 'cancelled', seedId: null };
  broadcast?.({ type: 'exploration:cancelled', data: {} });
  res.status(204).send();
});
