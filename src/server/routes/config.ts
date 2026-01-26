/**
 * Config API Routes
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { getConfig, resetConfig } from '../../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const configRouter = Router();

function getLocalConfigPath(): string {
  return join(__dirname, '..', '..', '..', 'config', 'local.yaml');
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
    const localPath = getLocalConfigPath();
    
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

    // Return updated config
    const newConfig = getConfig();
    res.json(newConfig);
  } catch (error) {
    console.error('[API] Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
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
