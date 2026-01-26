/**
 * Discoveries API Routes
 */

import { Router } from 'express';
import { getConfig } from '../../config.js';
import { Journal } from '../../journal/journal.js';
import { FeedbackManager, type FeedbackRating } from '../../feedback/feedback.js';

export const discoveriesRouter = Router();

function getJournal() {
  const config = getConfig();
  return new Journal(config.data_dir);
}

function getFeedbackManager() {
  const config = getConfig();
  return new FeedbackManager(config.data_dir);
}

// List discoveries
discoveriesRouter.get('/', async (req, res) => {
  try {
    const journal = getJournal();
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const minSignificance = req.query.min_significance
      ? parseFloat(req.query.min_significance as string)
      : undefined;

    const list = await journal.list({ since, minSignificance });
    res.json(list);
  } catch (error) {
    console.error('[API] Error listing discoveries:', error);
    res.status(500).json({ error: 'Failed to list discoveries' });
  }
});

// Get discovery by ID
discoveriesRouter.get('/:id', async (req, res) => {
  try {
    const journal = getJournal();
    const discovery = await journal.getById(req.params.id);
    if (!discovery) {
      return res.status(404).json({ error: 'Discovery not found' });
    }
    res.json(discovery);
  } catch (error) {
    console.error('[API] Error getting discovery:', error);
    res.status(500).json({ error: 'Failed to get discovery' });
  }
});

// Get feedback for a discovery
discoveriesRouter.get('/:id/feedback', async (req, res) => {
  try {
    const feedbackManager = getFeedbackManager();
    const feedback = await feedbackManager.getFeedback(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'No feedback found' });
    }
    res.json(feedback);
  } catch (error) {
    console.error('[API] Error getting feedback:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Set feedback for a discovery
discoveriesRouter.post('/:id/feedback', async (req, res) => {
  try {
    const { rating } = req.body as { rating?: string };
    
    if (!rating || (rating !== 'up' && rating !== 'down')) {
      return res.status(400).json({ error: 'rating must be "up" or "down"' });
    }

    const feedbackManager = getFeedbackManager();
    const feedback = await feedbackManager.setFeedback(req.params.id, rating as FeedbackRating);
    res.json(feedback);
  } catch (error) {
    console.error('[API] Error setting feedback:', error);
    res.status(500).json({ error: 'Failed to set feedback' });
  }
});

// Delete feedback for a discovery
discoveriesRouter.delete('/:id/feedback', async (req, res) => {
  try {
    const feedbackManager = getFeedbackManager();
    await feedbackManager.removeFeedback(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});
