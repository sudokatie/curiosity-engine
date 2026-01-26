/**
 * Seeds API Routes
 */

import { Router } from 'express';
import { getConfig } from '../../config.js';
import { SeedManager } from '../../seeds/seed_manager.js';
import { SeedSource, SeedStatus } from '../../types.js';

export const seedsRouter = Router();

function getSeedManager() {
  const config = getConfig();
  return new SeedManager(config.data_dir);
}

// List seeds
seedsRouter.get('/', async (req, res) => {
  try {
    const seeds = getSeedManager();
    const status = req.query.status as SeedStatus | undefined;
    const list = await seeds.list(status);
    res.json(list);
  } catch (error) {
    console.error('[API] Error listing seeds:', error);
    res.status(500).json({ error: 'Failed to list seeds' });
  }
});

// Get seed by ID
seedsRouter.get('/:id', async (req, res) => {
  try {
    const seeds = getSeedManager();
    const seed = await seeds.getById(req.params.id);
    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' });
    }
    res.json(seed);
  } catch (error) {
    console.error('[API] Error getting seed:', error);
    res.status(500).json({ error: 'Failed to get seed' });
  }
});

// Create seed
seedsRouter.post('/', async (req, res) => {
  try {
    const { content, priority } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const seeds = getSeedManager();
    const seed = await seeds.add(content, SeedSource.USER_INPUT);

    if (priority !== undefined) {
      await seeds.update(seed.id, { priority });
    }

    const updated = await seeds.getById(seed.id);
    res.status(201).json(updated);
  } catch (error) {
    console.error('[API] Error creating seed:', error);
    res.status(500).json({ error: 'Failed to create seed' });
  }
});

// Update seed
seedsRouter.patch('/:id', async (req, res) => {
  try {
    const seeds = getSeedManager();
    const { status, priority } = req.body;

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    const seed = await seeds.update(req.params.id, updates);
    res.json(seed);
  } catch (error) {
    console.error('[API] Error updating seed:', error);
    res.status(500).json({ error: 'Failed to update seed' });
  }
});

// Delete seed (archive)
seedsRouter.delete('/:id', async (req, res) => {
  try {
    const seeds = getSeedManager();
    await seeds.update(req.params.id, { status: SeedStatus.EXHAUSTED });
    res.status(204).send();
  } catch (error) {
    console.error('[API] Error deleting seed:', error);
    res.status(500).json({ error: 'Failed to delete seed' });
  }
});
