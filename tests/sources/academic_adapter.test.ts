/**
 * Tests for Academic Adapter (arXiv)
 * 
 * Note: Some tests hit the real arXiv API and may be slow.
 * Rate limiting is applied (3s between requests).
 */

import { describe, it, expect } from "vitest";
import { AcademicAdapter } from "../../src/sources/academic_adapter.js";

describe("AcademicAdapter", () => {
  const adapter = new AcademicAdapter({
    max_results: 3,
    categories: [],
  });

  describe("canHandle", () => {
    it("should handle arxiv: prefix", () => {
      expect(adapter.canHandle("arxiv:2301.00234")).toBe(true);
      expect(adapter.canHandle("arxiv:search:transformers")).toBe(true);
    });

    it("should not handle other prefixes", () => {
      expect(adapter.canHandle("https://arxiv.org/abs/2301.00234")).toBe(false);
      expect(adapter.canHandle("local:/path")).toBe(false);
      expect(adapter.canHandle("code:/path")).toBe(false);
    });
  });

  describe("fetch paper by ID", () => {
    it("should fetch a specific paper", async () => {
      // Using a well-known paper: "Attention Is All You Need"
      const content = await adapter.fetch("arxiv:1706.03762");

      expect(content.title).toContain("Attention");
      expect(content.text).toContain("Abstract");
      expect(content.text.toLowerCase()).toContain("transformer");
      expect(content.source_type).toBe("academic");
      expect(content.url).toBe("arxiv:1706.03762");
    }, 10000);

    it("should handle paper ID with version", async () => {
      const content = await adapter.fetch("arxiv:1706.03762v7");

      expect(content.title).toContain("Attention");
    }, 10000);

    it("should reject nonexistent paper", async () => {
      await expect(
        adapter.fetch("arxiv:9999.99999")
      ).rejects.toThrow("not found");
    }, 10000);
  });

  describe("search papers", () => {
    it("should search for papers", async () => {
      const content = await adapter.fetch("arxiv:search:transformer attention");

      expect(content.title).toContain("arXiv Search");
      expect(content.text).toContain("Found");
      expect(content.links.length).toBeGreaterThan(0);
      expect(content.links[0]).toMatch(/^arxiv:\d+\.\d+/);
    }, 15000);

    it("should return paper links in results", async () => {
      const content = await adapter.fetch("arxiv:search:neural network");

      expect(content.links.some(l => l.startsWith("arxiv:"))).toBe(true);
    }, 15000);
  });

  describe("extractLinks", () => {
    it("should extract arxiv links", async () => {
      const content = await adapter.fetch("arxiv:1706.03762");
      const links = adapter.extractLinks(content);

      // Should have category-based search links
      expect(links.some(l => l.startsWith("arxiv:search:"))).toBe(true);
    }, 10000);
  });

  describe("rate limiting", () => {
    it("should respect rate limits between requests", async () => {
      const start = Date.now();
      
      await adapter.fetch("arxiv:1706.03762");
      await adapter.fetch("arxiv:1706.03762");
      
      const elapsed = Date.now() - start;
      
      // Should take at least 3 seconds (the rate limit)
      expect(elapsed).toBeGreaterThanOrEqual(2900);
    }, 15000);
  });
});
