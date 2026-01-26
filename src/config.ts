/**
 * Configuration loader for Curiosity Engine
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { CuriosityConfig, DeepPartial } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default configuration values
const DEFAULT_CONFIG: CuriosityConfig = {
  heartbeat: {
    enabled: true,
    duration_minutes: 5,
  },
  deep_dive: {
    enabled: true,
    cron: "0 3 * * *",
    duration_minutes: 30,
  },
  exploration: {
    max_depth: 5,
    max_breadth: 1,
    source_timeout_ms: 30000,
    fetch_delay_ms: 1000,
  },
  sources: {
    web: {
      enabled: true,
      blocked_domains: [],
      preferred_domains: [],
      respect_robots: true,
    },
  },
  interestingness: {
    weights: {
      novelty: 0.3,
      connection_potential: 0.25,
      explanatory_power: 0.2,
      contradiction: 0.15,
      generativity: 0.1,
    },
    follow_threshold: 0.4,
    discovery_threshold: 0.6,
  },
  threads: {
    max_open: 50,
    decay_days: 14,
    revisit_probability: 0.1,
  },
  reporting: {
    daily_digest: true,
    digest_time: "09:00",
    breakthrough_alerts: true,
    breakthrough_threshold: 0.8,
    channel: null,
  },
  data_dir: "data",
  logging: {
    level: "info",
  },
};

/**
 * Deep merge two objects, with source values overriding target
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load YAML config file if it exists
 */
function loadYamlFile(path: string): DeepPartial<CuriosityConfig> | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    const parsed = parseYaml(content);
    return parsed?.curiosity ?? parsed ?? {};
  } catch (error) {
    console.error(`[WARN] Failed to parse config file ${path}:`, error);
    return null;
  }
}

/**
 * Validate configuration values
 */
function validateConfig(config: CuriosityConfig): void {
  // Validate weights sum to approximately 1
  const weights = config.interestingness.weights;
  const weightSum =
    weights.novelty +
    weights.connection_potential +
    weights.explanatory_power +
    weights.contradiction +
    weights.generativity;

  if (Math.abs(weightSum - 1.0) > 0.01) {
    console.warn(
      `[WARN] Interestingness weights sum to ${weightSum.toFixed(2)}, expected 1.0`
    );
  }

  // Validate thresholds are 0-1
  if (
    config.interestingness.follow_threshold < 0 ||
    config.interestingness.follow_threshold > 1
  ) {
    throw new Error("follow_threshold must be between 0 and 1");
  }

  if (
    config.interestingness.discovery_threshold < 0 ||
    config.interestingness.discovery_threshold > 1
  ) {
    throw new Error("discovery_threshold must be between 0 and 1");
  }

  // Validate exploration limits are positive
  if (config.exploration.max_depth < 1) {
    throw new Error("max_depth must be at least 1");
  }

  if (config.exploration.max_breadth < 1) {
    throw new Error("max_breadth must be at least 1");
  }
}

// Cached config instance
let cachedConfig: CuriosityConfig | null = null;

/**
 * Load configuration from files, merging with defaults
 */
export function loadConfig(configDir?: string): CuriosityConfig {
  const baseDir = configDir ?? join(__dirname, "..", "config");

  // Paths to check in order (later overrides earlier)
  const configPaths = [
    join(baseDir, "default.yaml"),
    join(baseDir, "local.yaml"),
  ];

  // Start with defaults
  let config = { ...DEFAULT_CONFIG };

  // Merge each config file
  for (const path of configPaths) {
    const fileConfig = loadYamlFile(path);
    if (fileConfig) {
      config = deepMerge(config, fileConfig);
    }
  }

  // Validate
  validateConfig(config);

  return config;
}

/**
 * Get configuration (cached singleton)
 */
export function getConfig(configDir?: string): CuriosityConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig(configDir);
  }
  return cachedConfig;
}

/**
 * Reset cached config (for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): CuriosityConfig {
  return { ...DEFAULT_CONFIG };
}
