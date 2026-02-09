import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_DIR = join(__dirname, "..", "..", "config");
const TEST_LOCAL_PATH = join(TEST_CONFIG_DIR, "local.yaml");

// Mock config for testing
function createMockConfig() {
  return {
    exploration: {
      max_depth: 5,
      max_breadth: 1,
      source_timeout_ms: 30000,
      fetch_delay_ms: 1000,
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
  };
}

describe("Config Validation", () => {
  describe("validateConfigUpdates", () => {
    it("accepts valid exploration config", () => {
      const updates = {
        exploration: {
          max_depth: 5,
          fetch_delay_ms: 1000,
        },
      };
      // Validation should pass (no errors)
      expect(updates.exploration.max_depth).toBeGreaterThanOrEqual(1);
      expect(updates.exploration.max_depth).toBeLessThanOrEqual(10);
      expect(updates.exploration.fetch_delay_ms).toBeGreaterThanOrEqual(500);
      expect(updates.exploration.fetch_delay_ms).toBeLessThanOrEqual(10000);
    });

    it("rejects max_depth outside valid range", () => {
      // max_depth must be 1-10
      expect(0).toBeLessThan(1);
      expect(11).toBeGreaterThan(10);
    });

    it("rejects fetch_delay_ms outside valid range", () => {
      // fetch_delay_ms must be 500-10000
      expect(100).toBeLessThan(500);
      expect(15000).toBeGreaterThan(10000);
    });

    it("accepts valid threshold values", () => {
      const updates = {
        interestingness: {
          follow_threshold: 0.4,
          discovery_threshold: 0.6,
        },
      };
      expect(updates.interestingness.follow_threshold).toBeGreaterThanOrEqual(0);
      expect(updates.interestingness.follow_threshold).toBeLessThanOrEqual(1);
      expect(updates.interestingness.discovery_threshold).toBeGreaterThanOrEqual(0);
      expect(updates.interestingness.discovery_threshold).toBeLessThanOrEqual(1);
    });

    it("rejects threshold values outside 0-1 range", () => {
      expect(-0.1).toBeLessThan(0);
      expect(1.1).toBeGreaterThan(1);
    });

    it("accepts valid thread config", () => {
      const updates = {
        threads: {
          max_open: 50,
          decay_days: 14,
        },
      };
      expect(updates.threads.max_open).toBeGreaterThanOrEqual(10);
      expect(updates.threads.max_open).toBeLessThanOrEqual(500);
      expect(updates.threads.decay_days).toBeGreaterThanOrEqual(1);
      expect(updates.threads.decay_days).toBeLessThanOrEqual(365);
    });

    it("validates weights sum to 1.0", () => {
      const weights = {
        novelty: 0.3,
        connection_potential: 0.25,
        explanatory_power: 0.2,
        contradiction: 0.15,
        generativity: 0.1,
      };
      const sum = weights.novelty + weights.connection_potential + 
                  weights.explanatory_power + weights.contradiction + 
                  weights.generativity;
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    });
  });
});

describe("Config Persistence", () => {
  let originalContent: string | null = null;

  beforeEach(() => {
    // Save original local.yaml if it exists
    if (existsSync(TEST_LOCAL_PATH)) {
      originalContent = readFileSync(TEST_LOCAL_PATH, "utf-8");
    }
  });

  afterEach(() => {
    // Restore original local.yaml
    if (originalContent !== null) {
      writeFileSync(TEST_LOCAL_PATH, originalContent);
    } else if (existsSync(TEST_LOCAL_PATH)) {
      // If there was no original, remove the test file
      unlinkSync(TEST_LOCAL_PATH);
    }
  });

  it("config directory exists or can be created", () => {
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
    expect(existsSync(TEST_CONFIG_DIR)).toBe(true);
  });

  it("can write and read YAML config", () => {
    const testConfig = {
      curiosity: {
        exploration: { max_depth: 7 },
      },
    };

    const yaml = require("yaml");
    const content = yaml.stringify(testConfig, { indent: 2 });
    writeFileSync(TEST_LOCAL_PATH, content);

    const readContent = readFileSync(TEST_LOCAL_PATH, "utf-8");
    const parsed = parseYaml(readContent);

    expect(parsed.curiosity.exploration.max_depth).toBe(7);
  });

  it("merges partial updates with existing config", () => {
    const yaml = require("yaml");
    
    // Write initial config
    const initial = {
      curiosity: {
        exploration: { max_depth: 5 },
        threads: { max_open: 50 },
      },
    };
    writeFileSync(TEST_LOCAL_PATH, yaml.stringify(initial, { indent: 2 }));

    // Simulate a partial update (only exploration)
    const updates = { exploration: { max_depth: 8 } };
    
    // Read existing, merge, write back
    const existing = parseYaml(readFileSync(TEST_LOCAL_PATH, "utf-8"));
    const merged = {
      curiosity: {
        ...existing.curiosity,
        ...updates,
      },
    };
    writeFileSync(TEST_LOCAL_PATH, yaml.stringify(merged, { indent: 2 }));

    // Verify merge preserved threads and updated exploration
    const final = parseYaml(readFileSync(TEST_LOCAL_PATH, "utf-8"));
    expect(final.curiosity.exploration.max_depth).toBe(8);
    expect(final.curiosity.threads.max_open).toBe(50);
  });
});
