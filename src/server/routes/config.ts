/**
 * Config API Routes
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { getConfig, resetConfig, getDefaultConfig } from '../../config.js';
import type { CuriosityConfig, DeepPartial } from '../../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const configRouter = Router();

function getLocalConfigPath(): string {
  return join(__dirname, '..', '..', '..', 'config', 'local.yaml');
}

/**
 * Validate config values before saving
 */
function validateConfigUpdates(updates: DeepPartial<CuriosityConfig>): string[] {
  const errors: string[] = [];

  // Validate exploration settings
  if (updates.exploration) {
    if (updates.exploration.max_depth !== undefined) {
      if (updates.exploration.max_depth < 1 || updates.exploration.max_depth > 10) {
        errors.push('max_depth must be between 1 and 10');
      }
    }
    if (updates.exploration.fetch_delay_ms !== undefined) {
      if (updates.exploration.fetch_delay_ms < 500 || updates.exploration.fetch_delay_ms > 10000) {
        errors.push('fetch_delay_ms must be between 500 and 10000');
      }
    }
  }

  // Validate thresholds
  if (updates.interestingness) {
    if (updates.interestingness.follow_threshold !== undefined) {
      if (updates.interestingness.follow_threshold < 0 || updates.interestingness.follow_threshold > 1) {
        errors.push('follow_threshold must be between 0 and 1');
      }
    }
    if (updates.interestingness.discovery_threshold !== undefined) {
      if (updates.interestingness.discovery_threshold < 0 || updates.interestingness.discovery_threshold > 1) {
        errors.push('discovery_threshold must be between 0 and 1');
      }
    }
    // Validate weights sum if provided
    if (updates.interestingness.weights) {
      const w = updates.interestingness.weights;
      const sum = (w.novelty ?? 0) + (w.connection_potential ?? 0) + 
                  (w.explanatory_power ?? 0) + (w.contradiction ?? 0) + 
                  (w.generativity ?? 0);
      if (sum > 0 && Math.abs(sum - 1.0) > 0.01) {
        errors.push(`Interestingness weights must sum to 1.0 (got ${sum.toFixed(2)})`);
      }
    }
  }

  // Validate thread settings
  if (updates.threads) {
    if (updates.threads.max_open !== undefined) {
      if (updates.threads.max_open < 10 || updates.threads.max_open > 500) {
        errors.push('max_open must be between 10 and 500');
      }
    }
    if (updates.threads.decay_days !== undefined) {
      if (updates.threads.decay_days < 1 || updates.threads.decay_days > 365) {
        errors.push('decay_days must be between 1 and 365');
      }
    }
  }

  return errors;
}

// Get current config
configRouter.get('/', (_req, res) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    console.error('[API] Error getting config:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Update config
configRouter.patch('/', (req, res) => {
  try {
    const updates = req.body;

    // Validate updates before saving
    const validationErrors = validateConfigUpdates(updates);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    const localPath = getLocalConfigPath();
    const configDir = dirname(localPath);

    // Ensure config directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    // Load existing local config or start fresh
    let localConfig: Record<string, unknown> = {};
    if (existsSync(localPath)) {
      const content = readFileSync(localPath, 'utf-8');
      const parsed = parseYaml(content);
      localConfig = parsed?.curiosity ?? parsed ?? {};
    }

    // Deep merge updates
    const merged = deepMerge(localConfig, updates);

    // Write back
    const yaml = stringifyYaml({ curiosity: merged }, { indent: 2 });
    writeFileSync(localPath, yaml);

    // Reset cached config so next getConfig() picks up changes
    resetConfig();

    // Return updated config with success indicator
    const newConfig = getConfig();
    res.json({ ...newConfig, _saved: true });
  } catch (error) {
    console.error('[API] Error updating config:', error);
    const message = error instanceof Error ? error.message : 'Failed to update config';
    res.status(500).json({ error: message });
  }
});

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}
