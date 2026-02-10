/**
 * Tests for Evaluator - LLM and heuristic evaluation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { Evaluator } from "../../src/evaluator/evaluator.js";
import type { CuriosityConfig, SourceContent } from "../../src/types.js";

// Mock content for testing
const mockContent: SourceContent = {
  url: "https://example.com/article",
  title: "Test Article",
  text: `This research explains why neural networks work. 
    However, contrary to popular belief, transformers might not be the final answer.
    Future research could explore alternative architectures.
    What if attention is not all you need?`,
  links: [
    "https://arxiv.org/paper1",
    "https://nature.com/paper2",
    "https://github.com/project",
  ],
  fetched_at: new Date().toISOString(),
  source_type: "web",
};

// Mock config
const mockConfig: CuriosityConfig = {
  heartbeat: { enabled: false, duration_minutes: 5 },
  deep_dive: { enabled: false, cron: "", duration_minutes: 30 },
  exploration: {
    max_depth: 5,
    max_breadth: 1,
    source_timeout_ms: 30000,
    fetch_delay_ms: 1000,
    concurrency: 3,
  },
  sources: {
    web: { enabled: true, blocked_domains: [], preferred_domains: [], respect_robots: true },
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
  threads: { max_open: 50, decay_days: 14, revisit_probability: 0.1 },
  reporting: {
    daily_digest: false,
    digest_time: "09:00",
    breakthrough_alerts: false,
    breakthrough_threshold: 0.8,
    channel: null,
  },
  data_dir: "data",
  logging: { level: "info" },
  llm: {
    enabled: false,
    provider: "clawdbot",
    cache_evaluations: true,
    cache_ttl_hours: 24,
  },
};

describe("Evaluator", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  describe("heuristic evaluation", () => {
    it("should score content using heuristics when LLM disabled", async () => {
      const evaluator = new Evaluator(mockConfig, db);
      const score = await evaluator.evaluate(mockContent);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(1);
      expect(score.novelty).toBe(0.5); // Default for heuristic
      expect(score.components.novelty.reasoning).toContain("Default");
    });

    it("should detect explanatory terms", async () => {
      const content: SourceContent = {
        ...mockContent,
        text: "This explains why. Because of this mechanism, therefore we see the results.",
      };
      const evaluator = new Evaluator(mockConfig, db);
      const score = await evaluator.evaluate(content);

      expect(score.explanatory_power).toBeGreaterThan(0.3);
      expect(score.components.explanatory_power.reasoning).toContain("explanatory terms");
    });

    it("should detect contradiction terms", async () => {
      const content: SourceContent = {
        ...mockContent,
        text: "However, this is a common misconception. Contrary to belief, the myth is incorrect.",
      };
      const evaluator = new Evaluator(mockConfig, db);
      const score = await evaluator.evaluate(content);

      expect(score.contradiction).toBeGreaterThan(0.5);
      expect(score.components.contradiction.reasoning).toContain("contrasting terms");
    });

    it("should measure connection potential from links", async () => {
      const content: SourceContent = {
        ...mockContent,
        links: [
          "https://arxiv.org/1",
          "https://nature.com/2",
          "https://github.com/3",
          "https://wikipedia.org/4",
          "https://nytimes.com/5",
        ],
      };
      const evaluator = new Evaluator(mockConfig, db);
      const score = await evaluator.evaluate(content);

      expect(score.connection_potential).toBe(0.5); // 5 domains / 10
    });

    it("should detect generativity from questions", async () => {
      const content: SourceContent = {
        ...mockContent,
        text: "What if this could work? Could we perhaps find another way? This remains unclear.",
      };
      const evaluator = new Evaluator(mockConfig, db);
      const score = await evaluator.evaluate(content);

      expect(score.generativity).toBeGreaterThan(0.4);
    });
  });

  describe("caching", () => {
    it("should cache evaluation results", async () => {
      const evaluator = new Evaluator(mockConfig, db);

      const score1 = await evaluator.evaluate(mockContent);
      const score2 = await evaluator.evaluate(mockContent);

      expect(score1.overall).toBe(score2.overall);

      const stats = evaluator.getCacheStats();
      expect(stats?.total).toBe(1);
    });

    it("should return different scores for different content", async () => {
      const evaluator = new Evaluator(mockConfig, db);

      const score1 = await evaluator.evaluate(mockContent);
      const score2 = await evaluator.evaluate({
        ...mockContent,
        url: "https://other.com/different",
        text: "Completely different content with no special terms.",
        links: [],
      });

      expect(score1.overall).not.toBe(score2.overall);

      const stats = evaluator.getCacheStats();
      expect(stats?.total).toBe(2);
    });

    it("should prune expired entries", async () => {
      const configWithShortTtl = {
        ...mockConfig,
        llm: { ...mockConfig.llm, cache_ttl_hours: 0 }, // Immediate expiry
      };
      const evaluator = new Evaluator(configWithShortTtl, db);

      await evaluator.evaluate(mockContent);
      
      // Wait a tiny bit for expiry
      await new Promise((r) => setTimeout(r, 10));
      
      const pruned = evaluator.pruneCache();
      expect(pruned).toBe(1);
    });
  });

  describe("LLM evaluation", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should use LLM when enabled", async () => {
      const llmConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, enabled: true },
      };
      const evaluator = new Evaluator(llmConfig, db);

      // Mock fetch
      const mockResponse = {
        novelty: 0.8,
        connection_potential: 0.7,
        explanatory_power: 0.6,
        contradiction: 0.5,
        generativity: 0.9,
        reasoning: {
          novelty: "Novel finding",
          connection_potential: "Bridges AI and neuroscience",
          explanatory_power: "Explains mechanism",
          contradiction: "Challenges transformers",
          generativity: "Opens new questions",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: JSON.stringify(mockResponse) }),
      });

      const score = await evaluator.evaluate(mockContent);

      expect(score.novelty).toBe(0.8);
      expect(score.generativity).toBe(0.9);
      expect(score.components.novelty.reasoning).toBe("Novel finding");
    });

    it("should fall back to heuristics on LLM failure", async () => {
      const llmConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, enabled: true },
      };
      const evaluator = new Evaluator(llmConfig, db);

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const score = await evaluator.evaluate(mockContent);

      // Should fall back to heuristic defaults
      expect(score.novelty).toBe(0.5);
      expect(score.components.novelty.reasoning).toContain("Default");
    });

    it("should handle malformed LLM responses", async () => {
      const llmConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, enabled: true },
      };
      const evaluator = new Evaluator(llmConfig, db);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: "not valid json at all" }),
      });

      const score = await evaluator.evaluate(mockContent);

      // Should fall back to heuristics
      expect(score.novelty).toBe(0.5);
    });

    it("should clamp LLM scores to valid range", async () => {
      const llmConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, enabled: true },
      };
      const evaluator = new Evaluator(llmConfig, db);

      const mockResponse = {
        novelty: 1.5, // Out of range
        connection_potential: -0.3, // Out of range
        explanatory_power: 0.6,
        contradiction: "invalid", // Not a number
        generativity: 0.9,
        reasoning: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: JSON.stringify(mockResponse) }),
      });

      const score = await evaluator.evaluate(mockContent);

      expect(score.novelty).toBe(1.0); // Clamped to max
      expect(score.connection_potential).toBe(0.0); // Clamped to min
      expect(score.contradiction).toBe(0.5); // Default for invalid
    });

    it("should handle OpenAI response format", async () => {
      const llmConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, enabled: true, provider: "openai" as const },
      };
      const evaluator = new Evaluator(llmConfig, db);

      const mockResponse = {
        novelty: 0.7,
        connection_potential: 0.6,
        explanatory_power: 0.5,
        contradiction: 0.4,
        generativity: 0.8,
        reasoning: {
          novelty: "Test",
          connection_potential: "Test",
          explanatory_power: "Test",
          contradiction: "Test",
          generativity: "Test",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }],
          }),
      });

      const score = await evaluator.evaluate(mockContent);

      expect(score.novelty).toBe(0.7);
      expect(score.generativity).toBe(0.8);
    });

    it("should handle Ollama response format", async () => {
      const llmConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, enabled: true, provider: "ollama" as const },
      };
      const evaluator = new Evaluator(llmConfig, db);

      const mockResponse = {
        novelty: 0.65,
        connection_potential: 0.55,
        explanatory_power: 0.45,
        contradiction: 0.35,
        generativity: 0.75,
        reasoning: {
          novelty: "Ollama test",
          connection_potential: "Ollama test",
          explanatory_power: "Ollama test",
          contradiction: "Ollama test",
          generativity: "Ollama test",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify(mockResponse),
          }),
      });

      const score = await evaluator.evaluate(mockContent);

      expect(score.novelty).toBe(0.65);
      expect(score.components.novelty.reasoning).toBe("Ollama test");
    });
  });

  describe("weighted scoring", () => {
    it("should calculate overall score from weighted components", async () => {
      const evaluator = new Evaluator(mockConfig, db);
      const score = await evaluator.evaluate(mockContent);

      // Manually calculate expected overall
      const expected =
        score.novelty * 0.3 +
        score.connection_potential * 0.25 +
        score.explanatory_power * 0.2 +
        score.contradiction * 0.15 +
        score.generativity * 0.1;

      expect(score.overall).toBeCloseTo(expected, 5);
    });

    it("should respect custom weights", async () => {
      const customConfig = {
        ...mockConfig,
        interestingness: {
          ...mockConfig.interestingness,
          weights: {
            novelty: 1.0,
            connection_potential: 0,
            explanatory_power: 0,
            contradiction: 0,
            generativity: 0,
          },
        },
      };
      const evaluator = new Evaluator(customConfig, db);
      const score = await evaluator.evaluate(mockContent);

      // Overall should equal novelty when it's the only weight
      expect(score.overall).toBe(score.novelty);
    });
  });
});
