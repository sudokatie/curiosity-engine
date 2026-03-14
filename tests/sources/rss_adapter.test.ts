/**
 * Tests for RSS/Atom Adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RssAdapter, SeenItemsTracker, createRssAdapter } from "../../src/sources/rss_adapter.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Sample RSS 2.0 feed
const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <link>https://example.com</link>
    <description>A test blog</description>
    <item>
      <title>First Post</title>
      <link>https://example.com/post-1</link>
      <description>This is the first post</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <guid>post-1</guid>
      <author>test@example.com</author>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/post-2</link>
      <description><![CDATA[This post has <b>HTML</b> content]]></description>
      <pubDate>Tue, 02 Jan 2024 12:00:00 GMT</pubDate>
      <guid>post-2</guid>
    </item>
  </channel>
</rss>`;

// Sample Atom 1.0 feed
const SAMPLE_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Test Feed</title>
  <link href="https://example.org"/>
  <subtitle>An Atom test feed</subtitle>
  <entry>
    <title>Atom Entry 1</title>
    <link href="https://example.org/entry-1"/>
    <id>entry-1</id>
    <summary>First Atom entry summary</summary>
    <published>2024-01-15T10:00:00Z</published>
    <author>
      <name>John Doe</name>
    </author>
  </entry>
  <entry>
    <title>Atom Entry 2</title>
    <link href="https://example.org/entry-2"/>
    <id>entry-2</id>
    <content>Second entry content</content>
    <updated>2024-01-16T10:00:00Z</updated>
  </entry>
</feed>`;

describe("RssAdapter", () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rss-test-"));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("canHandle", () => {
    it("should handle rss:// prefix", () => {
      const adapter = new RssAdapter({}, tempDir);
      expect(adapter.canHandle("rss://example.com/feed")).toBe(true);
      expect(adapter.canHandle("rss://blog.example.org/rss.xml")).toBe(true);
    });

    it("should handle configured feed URLs", () => {
      const adapter = new RssAdapter({
        feeds: [
          { url: "https://blog.example.com/feed.xml" },
          { url: "https://news.site/rss" },
        ],
      }, tempDir);
      
      expect(adapter.canHandle("https://blog.example.com/feed.xml")).toBe(true);
      expect(adapter.canHandle("https://news.site/rss")).toBe(true);
      expect(adapter.canHandle("https://other.com/feed")).toBe(false);
    });

    it("should not handle regular URLs", () => {
      const adapter = new RssAdapter({}, tempDir);
      expect(adapter.canHandle("https://example.com")).toBe(false);
      expect(adapter.canHandle("http://blog.com/article")).toBe(false);
    });
  });

  describe("fetch RSS feed", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });
    
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should parse RSS 2.0 feed", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_RSS),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({}, tempDir);
      const content = await adapter.fetch("rss://example.com/feed");

      expect(content.title).toContain("Test Blog");
      expect(content.text).toContain("First Post");
      expect(content.text).toContain("Second Post");
      expect(content.links).toContain("https://example.com/post-1");
      expect(content.links).toContain("https://example.com/post-2");
      expect(content.source_type).toBe("rss");
    });

    it("should parse Atom 1.0 feed", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_ATOM),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({}, tempDir);
      const content = await adapter.fetch("rss://example.org/atom");

      expect(content.title).toContain("Atom Test Feed");
      expect(content.text).toContain("Atom Entry 1");
      expect(content.text).toContain("Atom Entry 2");
      expect(content.text).toContain("John Doe");
      expect(content.links).toContain("https://example.org/entry-1");
      expect(content.links).toContain("https://example.org/entry-2");
    });

    it("should convert rss:// to https://", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_RSS),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({}, tempDir);
      await adapter.fetch("rss://example.com/feed.xml");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/feed.xml",
        expect.any(Object)
      );
    });

    it("should handle HTTP errors", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({}, tempDir);
      
      await expect(adapter.fetch("rss://example.com/missing"))
        .rejects.toThrow("HTTP 404");
    });

    it("should strip HTML from descriptions", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_RSS),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({}, tempDir);
      const content = await adapter.fetch("rss://example.com/feed");

      // Should not contain HTML tags
      expect(content.text).not.toContain("<b>");
      expect(content.text).toContain("HTML content");
    });
  });

  describe("deduplication", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });
    
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should filter out already-seen items", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_RSS),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({}, tempDir);
      
      // First fetch - should get both items
      const content1 = await adapter.fetch("rss://example.com/feed");
      expect(content1.links.length).toBe(2);
      
      // Second fetch - should get no items (all seen)
      const content2 = await adapter.fetch("rss://example.com/feed");
      expect(content2.text).toBe("No new items");
      expect(content2.links.length).toBe(0);
    });

    it("should persist seen items across adapter instances", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_RSS),
      });
      vi.stubGlobal("fetch", mockFetch);

      // First adapter sees items
      const adapter1 = new RssAdapter({}, tempDir);
      await adapter1.fetch("rss://example.com/feed");
      
      // Second adapter should not see same items
      const adapter2 = new RssAdapter({}, tempDir);
      const content = await adapter2.fetch("rss://example.com/feed");
      expect(content.text).toBe("No new items");
    });

    it("should respect max_items_per_feed limit", async () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => `
        <item>
          <title>Post ${i}</title>
          <link>https://example.com/post-${i}</link>
          <description>Post ${i} content</description>
          <guid>post-${i}</guid>
        </item>
      `).join("");
      
      const bigFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Big Feed</title>
            ${manyItems}
          </channel>
        </rss>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(bigFeed),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new RssAdapter({ max_items_per_feed: 10 }, tempDir);
      const content = await adapter.fetch("rss://example.com/feed");

      // Should be limited to 10 items
      expect(content.links.length).toBe(10);
    });
  });

  describe("extractLinks", () => {
    it("should return item links from content", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_RSS),
      });
      vi.stubGlobal("fetch", vi.fn().mockImplementation(mockFetch));

      const adapter = new RssAdapter({}, tempDir);
      const content = await adapter.fetch("rss://example.com/feed");
      const links = adapter.extractLinks(content);

      expect(links).toEqual(content.links);
    });
  });

  describe("feed management", () => {
    it("should add new feeds", () => {
      const adapter = new RssAdapter({}, tempDir);
      
      adapter.addFeed({ url: "https://blog.com/feed.xml", name: "My Blog" });
      
      expect(adapter.canHandle("https://blog.com/feed.xml")).toBe(true);
      expect(adapter.getFeeds()).toHaveLength(1);
      expect(adapter.getFeeds()[0].name).toBe("My Blog");
    });

    it("should not add duplicate feeds", () => {
      const adapter = new RssAdapter({}, tempDir);
      
      adapter.addFeed({ url: "https://blog.com/feed.xml" });
      adapter.addFeed({ url: "https://blog.com/feed.xml" });
      
      expect(adapter.getFeeds()).toHaveLength(1);
    });

    it("should remove feeds", () => {
      const adapter = new RssAdapter({
        feeds: [{ url: "https://blog.com/feed.xml" }],
      }, tempDir);
      
      const removed = adapter.removeFeed("https://blog.com/feed.xml");
      
      expect(removed).toBe(true);
      expect(adapter.getFeeds()).toHaveLength(0);
      expect(adapter.canHandle("https://blog.com/feed.xml")).toBe(false);
    });

    it("should return false when removing nonexistent feed", () => {
      const adapter = new RssAdapter({}, tempDir);
      
      const removed = adapter.removeFeed("https://nonexistent.com/feed");
      
      expect(removed).toBe(false);
    });
  });
});

describe("SeenItemsTracker", () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seen-test-"));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should track seen items", () => {
    const tracker = new SeenItemsTracker(tempDir);
    
    expect(tracker.has("item-1")).toBe(false);
    
    tracker.add("item-1");
    expect(tracker.has("item-1")).toBe(true);
  });

  it("should persist across instances", () => {
    const tracker1 = new SeenItemsTracker(tempDir);
    tracker1.markSeen(["item-1", "item-2"]);
    
    const tracker2 = new SeenItemsTracker(tempDir);
    expect(tracker2.has("item-1")).toBe(true);
    expect(tracker2.has("item-2")).toBe(true);
    expect(tracker2.has("item-3")).toBe(false);
  });
});

describe("createRssAdapter", () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-test-"));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create adapter with default config", () => {
    const adapter = createRssAdapter({ feeds: [] }, tempDir);
    expect(adapter.name).toBe("rss");
    expect(adapter.getFeeds()).toHaveLength(0);
  });

  it("should create adapter with custom config", () => {
    const adapter = createRssAdapter({
      feeds: [{ url: "https://blog.com/rss" }],
      max_items_per_feed: 5,
    }, tempDir);
    
    expect(adapter.getFeeds()).toHaveLength(1);
  });
});
