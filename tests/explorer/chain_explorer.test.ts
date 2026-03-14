/**
 * Tests for Chain Explorer
 */

import { describe, it, expect } from "vitest";
import {
  ChainPriorityQueue,
  ChainLink,
  extractUrlsFromText,
  extractChainLinks,
} from "../../src/explorer/chain_explorer.js";
import type { Discovery } from "../../src/types.js";

describe("ChainPriorityQueue", () => {
  it("should add and retrieve links by priority", () => {
    const queue = new ChainPriorityQueue();

    queue.add({
      url: "https://low.com",
      sourceDiscoveryId: "d1",
      sourceTitle: "Low Priority",
      priority: 0.3,
      depth: 0,
    });

    queue.add({
      url: "https://high.com",
      sourceDiscoveryId: "d2",
      sourceTitle: "High Priority",
      priority: 0.9,
      depth: 0,
    });

    queue.add({
      url: "https://medium.com",
      sourceDiscoveryId: "d3",
      sourceTitle: "Medium Priority",
      priority: 0.6,
      depth: 0,
    });

    expect(queue.size()).toBe(3);

    // Should return highest priority first
    const first = queue.pop();
    expect(first?.url).toBe("https://high.com");
    expect(first?.priority).toBe(0.9);

    const second = queue.pop();
    expect(second?.url).toBe("https://medium.com");
    expect(second?.priority).toBe(0.6);

    const third = queue.pop();
    expect(third?.url).toBe("https://low.com");
    expect(third?.priority).toBe(0.3);

    expect(queue.isEmpty()).toBe(true);
  });

  it("should not add duplicate URLs", () => {
    const queue = new ChainPriorityQueue();

    const link: ChainLink = {
      url: "https://example.com",
      sourceDiscoveryId: "d1",
      sourceTitle: "Test",
      priority: 0.5,
      depth: 0,
    };

    expect(queue.add(link)).toBe(true);
    expect(queue.add(link)).toBe(false);
    expect(queue.size()).toBe(1);
  });

  it("should track seen URLs", () => {
    const queue = new ChainPriorityQueue();

    queue.add({
      url: "https://seen.com",
      sourceDiscoveryId: "d1",
      sourceTitle: "Test",
      priority: 0.5,
      depth: 0,
    });

    expect(queue.hasSeen("https://seen.com")).toBe(true);
    expect(queue.hasSeen("https://unseen.com")).toBe(false);
  });

  it("should addAll and return count of added links", () => {
    const queue = new ChainPriorityQueue();

    const links: ChainLink[] = [
      { url: "https://a.com", sourceDiscoveryId: "d1", sourceTitle: "A", priority: 0.5, depth: 0 },
      { url: "https://b.com", sourceDiscoveryId: "d1", sourceTitle: "B", priority: 0.6, depth: 0 },
      { url: "https://a.com", sourceDiscoveryId: "d2", sourceTitle: "A dup", priority: 0.7, depth: 0 }, // Duplicate
    ];

    const added = queue.addAll(links);
    expect(added).toBe(2); // Only 2 unique URLs
    expect(queue.size()).toBe(2);
  });

  it("should peek without removing", () => {
    const queue = new ChainPriorityQueue();

    queue.add({
      url: "https://example.com",
      sourceDiscoveryId: "d1",
      sourceTitle: "Test",
      priority: 0.5,
      depth: 0,
    });

    expect(queue.peek()?.url).toBe("https://example.com");
    expect(queue.size()).toBe(1); // Still there
  });
});

describe("extractUrlsFromText", () => {
  it("should extract http URLs", () => {
    const text = "Check out http://example.com and http://test.org/page for more info.";
    const urls = extractUrlsFromText(text);
    
    expect(urls).toContain("http://example.com");
    expect(urls).toContain("http://test.org/page");
    expect(urls.length).toBe(2);
  });

  it("should extract https URLs", () => {
    const text = "Visit https://secure.example.com/path?query=1";
    const urls = extractUrlsFromText(text);
    
    expect(urls).toContain("https://secure.example.com/path?query=1");
    expect(urls.length).toBe(1);
  });

  it("should clean trailing punctuation", () => {
    const text = "See https://example.com. And https://test.com, or https://other.com!";
    const urls = extractUrlsFromText(text);
    
    expect(urls).toContain("https://example.com");
    expect(urls).toContain("https://test.com");
    expect(urls).toContain("https://other.com");
  });

  it("should deduplicate URLs", () => {
    const text = "Link: https://example.com and again https://example.com";
    const urls = extractUrlsFromText(text);
    
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe("https://example.com");
  });

  it("should skip non-http URLs", () => {
    const text = "mailto:test@example.com javascript:void(0) tel:1234567";
    const urls = extractUrlsFromText(text);
    
    expect(urls.length).toBe(0);
  });

  it("should handle URLs in markdown", () => {
    const text = "Check [this link](https://example.com/page) for details.";
    const urls = extractUrlsFromText(text);
    
    expect(urls).toContain("https://example.com/page");
  });
});

describe("extractChainLinks", () => {
  const mockDiscovery: Discovery = {
    id: "disc-123",
    session_id: "sess-456",
    seed_path: ["seed"],
    title: "Test Discovery",
    content: "Found interesting info at https://link1.com and https://link2.com/page",
    significance: 0.8,
    connections: [],
    questions: [],
    tags: [],
    created_at: "2026-01-01T00:00:00Z",
  };

  it("should extract links with source info", () => {
    const links = extractChainLinks(mockDiscovery);

    expect(links.length).toBe(2);
    expect(links[0].sourceDiscoveryId).toBe("disc-123");
    expect(links[0].sourceTitle).toBe("Test Discovery");
  });

  it("should set priority based on significance", () => {
    const links = extractChainLinks(mockDiscovery, 0);

    expect(links[0].priority).toBe(0.8); // No decay at depth 0
  });

  it("should decay priority with depth", () => {
    const links0 = extractChainLinks(mockDiscovery, 0);
    const links1 = extractChainLinks(mockDiscovery, 1);
    const links2 = extractChainLinks(mockDiscovery, 2);

    expect(links0[0].priority).toBe(0.8);
    expect(links1[0].priority).toBeCloseTo(0.64, 2); // 0.8 * 0.8
    expect(links2[0].priority).toBeCloseTo(0.512, 2); // 0.8 * 0.8 * 0.8
  });

  it("should set depth on extracted links", () => {
    const links = extractChainLinks(mockDiscovery, 2);

    expect(links[0].depth).toBe(2);
  });

  it("should return empty array for content without URLs", () => {
    const discovery: Discovery = {
      ...mockDiscovery,
      content: "No URLs here, just plain text.",
    };

    const links = extractChainLinks(discovery);
    expect(links.length).toBe(0);
  });
});
