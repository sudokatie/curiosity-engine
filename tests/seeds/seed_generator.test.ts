/**
 * Tests for Seed Generator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateFromConversation,
  generateFromDiscovery,
  generateFromPatterns,
} from "../../src/seeds/seed_generator.js";
import type { Discovery } from "../../src/types.js";

describe("Seed Generator", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateFromConversation", () => {
    describe("without LLM (fallback)", () => {
      it("extracts questions from text", async () => {
        const text = "I wonder what happens next? The answer is unclear. Why is the sky blue?";
        const seeds = await generateFromConversation(text, false);

        expect(seeds.length).toBeGreaterThan(0);
        expect(seeds[0].source).toBe("conversation");
      });

      it("returns empty array when no questions found", async () => {
        const text = "This is a statement. So is this one.";
        const seeds = await generateFromConversation(text, false);

        expect(seeds).toEqual([]);
      });

      it("limits to 3 questions", async () => {
        const text = "Q1? Q2? Q3? Q4? Q5?";
        const seeds = await generateFromConversation(text, false);

        expect(seeds.length).toBeLessThanOrEqual(3);
      });
    });

    describe("with LLM", () => {
      it("uses LLM response when available", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: '{"seeds": [{"content": "Explore quantum effects", "priority": 0.8}]}',
          }),
        });

        const seeds = await generateFromConversation("Quantum computing is fascinating", true);

        expect(seeds.length).toBe(1);
        expect(seeds[0].content).toBe("Explore quantum effects");
        expect(seeds[0].priority).toBe(0.8);
      });

      it("falls back when LLM fails", async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

        const text = "What is consciousness? I'm curious about the mind.";
        const seeds = await generateFromConversation(text, true);

        // Should fall back to question extraction
        expect(seeds.length).toBeGreaterThan(0);
      });
    });
  });

  describe("generateFromDiscovery", () => {
    const baseDiscovery: Discovery = {
      id: "test-id",
      seed_id: "seed-id",
      title: "Test Discovery",
      content: "This is test content about an interesting topic.",
      source_url: "https://example.com",
      significance: 0.75,
      questions: ["What happens next?", "Why is this important?"],
      tags: ["test", "discovery"],
      created_at: new Date().toISOString(),
    };

    describe("without LLM", () => {
      it("creates seeds from discovery questions", async () => {
        const seeds = await generateFromDiscovery(baseDiscovery, false);

        expect(seeds.length).toBe(2);
        expect(seeds[0].content).toBe("What happens next?");
        expect(seeds[1].content).toBe("Why is this important?");
        expect(seeds[0].source).toBe("discovery");
      });

      it("scales priority by significance", async () => {
        const seeds = await generateFromDiscovery(baseDiscovery, false);

        // Priority should be significance * 0.8 = 0.75 * 0.8 = 0.6
        expect(seeds[0].priority).toBeCloseTo(0.6, 1);
      });
    });

    describe("with LLM", () => {
      it("adds LLM-generated seeds to question-based seeds", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: '{"seeds": [{"content": "LLM follow-up question", "priority": 0.9}]}',
          }),
        });

        const seeds = await generateFromDiscovery(
          { ...baseDiscovery, content: "x".repeat(200) },
          true
        );

        // Should have both question seeds + LLM seed
        expect(seeds.length).toBe(3);
        expect(seeds.some((s) => s.content === "LLM follow-up question")).toBe(true);
      });
    });
  });

  describe("generateFromPatterns", () => {
    const createDiscovery = (title: string, tags: string[]): Discovery => ({
      id: `id-${title}`,
      seed_id: "seed-id",
      title,
      content: "Content",
      source_url: "https://example.com",
      significance: 0.5,
      questions: [],
      tags,
      created_at: new Date().toISOString(),
    });

    it("returns empty for less than 3 discoveries", async () => {
      const discoveries = [
        createDiscovery("D1", ["tag1"]),
        createDiscovery("D2", ["tag2"]),
      ];

      const seeds = await generateFromPatterns(discoveries, false);

      expect(seeds).toEqual([]);
    });

    describe("without LLM (fallback)", () => {
      it("creates seeds from common tags", async () => {
        const discoveries = [
          createDiscovery("D1", ["ai", "ml"]),
          createDiscovery("D2", ["ai", "data"]),
          createDiscovery("D3", ["ai", "ethics"]),
        ];

        const seeds = await generateFromPatterns(discoveries, false);

        expect(seeds.length).toBeGreaterThan(0);
        expect(seeds[0].content).toContain("ai");
        expect(seeds[0].source).toBe("observation");
      });

      it("prioritizes tags appearing more frequently", async () => {
        const discoveries = [
          createDiscovery("D1", ["common", "rare"]),
          createDiscovery("D2", ["common"]),
          createDiscovery("D3", ["common"]),
        ];

        const seeds = await generateFromPatterns(discoveries, false);

        expect(seeds[0].content).toContain("common");
      });
    });

    describe("with LLM", () => {
      it("uses LLM for meta-pattern analysis", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: '{"seeds": [{"content": "Meta-pattern seed", "priority": 0.85}]}',
          }),
        });

        const discoveries = [
          createDiscovery("D1", []),
          createDiscovery("D2", []),
          createDiscovery("D3", []),
        ];

        const seeds = await generateFromPatterns(discoveries, true);

        expect(seeds[0].content).toBe("Meta-pattern seed");
      });
    });
  });

  describe("Seed object structure", () => {
    it("creates valid seed objects with all required fields", async () => {
      const seeds = await generateFromConversation("What is life?", false);
      const seed = seeds[0];

      expect(seed.id).toBeDefined();
      expect(seed.content).toBeDefined();
      expect(seed.source).toBe("conversation");
      expect(seed.created_at).toBeDefined();
      expect(seed.priority).toBeGreaterThanOrEqual(0);
      expect(seed.priority).toBeLessThanOrEqual(1);
      expect(seed.times_explored).toBe(0);
      expect(seed.last_explored_at).toBeNull();
      expect(seed.status).toBe("active");
      expect(Array.isArray(seed.tags)).toBe(true);
    });
  });
});
