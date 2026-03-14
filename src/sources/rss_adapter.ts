/**
 * RSS Adapter - Subscribe to and parse RSS/Atom feeds
 * 
 * Supports both RSS 2.0 and Atom 1.0 formats.
 * Tracks seen items to avoid duplicate processing.
 */

import type { SourceAdapter } from "./adapter.js";
import { SourceFetchError } from "./adapter.js";
import type { SourceContent, RssSourceConfig, RssFeed } from "../types.js";
import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_CONFIG: RssSourceConfig = {
  enabled: true,
  feeds: [],
  default_poll_interval_minutes: 60,
  max_items_per_feed: 20,
};

const MAX_CONTENT_LENGTH = 100000;

interface FeedItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
}

interface ParsedFeed {
  title: string;
  link: string;
  description: string;
  items: FeedItem[];
}

/**
 * Track seen feed items for deduplication
 */
export class SeenItemsTracker {
  private seen: Set<string>;
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "rss_seen_items.json");
    this.seen = this.load();
  }

  private load(): Set<string> {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        return new Set(data.items || []);
      }
    } catch {
      // Ignore errors, start fresh
    }
    return new Set();
  }

  save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Keep only recent items (max 10000)
      const items = Array.from(this.seen).slice(-10000);
      fs.writeFileSync(this.filePath, JSON.stringify({ items }, null, 2));
    } catch {
      // Ignore save errors
    }
  }

  has(id: string): boolean {
    return this.seen.has(id);
  }

  add(id: string): void {
    this.seen.add(id);
  }

  markSeen(ids: string[]): void {
    for (const id of ids) {
      this.seen.add(id);
    }
    this.save();
  }
}

/**
 * Parse RSS 2.0 feed XML
 */
function parseRss(xml: string): ParsedFeed {
  const getTagContent = (s: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = s.match(regex);
    return match ? match[1].trim() : "";
  };

  const getCdataContent = (s: string): string => {
    // Handle CDATA sections
    const cdataMatch = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    return cdataMatch ? cdataMatch[1] : s;
  };

  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  if (!channelMatch) {
    return { title: "", link: "", description: "", items: [] };
  }

  const channel = channelMatch[1];
  
  // Parse channel metadata (before items)
  const channelMeta = channel.split(/<item>/i)[0];
  const title = getCdataContent(getTagContent(channelMeta, "title"));
  const link = getTagContent(channelMeta, "link");
  const description = getCdataContent(getTagContent(channelMeta, "description"));

  // Parse items
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const itemTitle = getCdataContent(getTagContent(item, "title"));
    const itemLink = getTagContent(item, "link");
    const itemDesc = getCdataContent(getTagContent(item, "description"));
    const pubDate = getTagContent(item, "pubDate");
    const guid = getTagContent(item, "guid") || itemLink;
    const author = getTagContent(item, "author") || getTagContent(item, "dc:creator");

    items.push({
      id: guid || itemLink || itemTitle,
      title: itemTitle,
      link: itemLink,
      description: itemDesc.replace(/<[^>]+>/g, "").substring(0, 1000),
      pubDate,
      author: author ? getCdataContent(author) : undefined,
    });
  }

  return { title, link, description, items };
}

/**
 * Parse Atom 1.0 feed XML
 */
function parseAtom(xml: string): ParsedFeed {
  const getTagContent = (s: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = s.match(regex);
    return match ? match[1].trim() : "";
  };

  const getLinkHref = (s: string): string => {
    const linkMatch = s.match(/<link[^>]*href="([^"]+)"[^>]*(?:rel="alternate")?/i);
    return linkMatch ? linkMatch[1] : "";
  };

  // Get feed-level info
  const feedMatch = xml.match(/<feed[^>]*>([\s\S]*)/i);
  if (!feedMatch) {
    return { title: "", link: "", description: "", items: [] };
  }

  const feed = feedMatch[1];
  const feedMeta = feed.split(/<entry>/i)[0];
  const title = getTagContent(feedMeta, "title");
  const link = getLinkHref(feedMeta);
  const description = getTagContent(feedMeta, "subtitle") || getTagContent(feedMeta, "summary");

  // Parse entries
  const items: FeedItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const entryTitle = getTagContent(entry, "title");
    const entryLink = getLinkHref(entry);
    const entryId = getTagContent(entry, "id") || entryLink;
    const summary = getTagContent(entry, "summary") || getTagContent(entry, "content");
    const published = getTagContent(entry, "published") || getTagContent(entry, "updated");
    
    // Get author name
    const authorMatch = entry.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/i);
    const author = authorMatch ? authorMatch[1] : undefined;

    items.push({
      id: entryId || entryLink || entryTitle,
      title: entryTitle,
      link: entryLink,
      description: summary.replace(/<[^>]+>/g, "").substring(0, 1000),
      pubDate: published,
      author,
    });
  }

  return { title, link, description, items };
}

/**
 * Detect feed format and parse accordingly
 */
function parseFeed(xml: string): ParsedFeed {
  if (xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"")) {
    return parseAtom(xml);
  }
  if (xml.includes("<rss") || xml.includes("<channel>")) {
    return parseRss(xml);
  }
  // Try Atom first, fall back to RSS
  if (xml.includes("<entry>")) {
    return parseAtom(xml);
  }
  return parseRss(xml);
}

/**
 * RSS/Atom Feed Adapter
 */
export class RssAdapter implements SourceAdapter {
  name = "rss";
  private config: RssSourceConfig;
  private seenTracker: SeenItemsTracker;
  private feedUrls: Set<string>;

  constructor(config?: Partial<RssSourceConfig>, dataDir: string = ".") {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.seenTracker = new SeenItemsTracker(dataDir);
    this.feedUrls = new Set(this.config.feeds.map(f => f.url));
  }

  /**
   * Check if this adapter can handle the given target.
   * Handles rss:// prefix or configured feed URLs.
   */
  canHandle(target: string): boolean {
    if (target.startsWith("rss://")) {
      return true;
    }
    // Check if it's a configured feed
    return this.feedUrls.has(target);
  }

  /**
   * Fetch and parse a feed, returning new (unseen) items as content
   */
  async fetch(target: string): Promise<SourceContent> {
    // Convert rss:// to https://
    const url = target.startsWith("rss://") 
      ? target.replace("rss://", "https://")
      : target;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CuriosityEngine/1.0 (RSS Reader)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      throw new SourceFetchError(url, response.status, `HTTP ${response.status}`);
    }

    const xml = await response.text();
    if (xml.length > MAX_CONTENT_LENGTH) {
      throw new SourceFetchError(url, undefined, "Feed too large");
    }

    const feed = parseFeed(xml);
    
    // Filter to new items only
    const newItems = feed.items
      .filter(item => !this.seenTracker.has(item.id))
      .slice(0, this.config.max_items_per_feed);

    // Mark items as seen
    if (newItems.length > 0) {
      this.seenTracker.markSeen(newItems.map(i => i.id));
    }

    // Build content from new items
    const text = newItems.map(item => {
      let entry = `## ${item.title}\n\n`;
      if (item.author) {
        entry += `By: ${item.author}\n`;
      }
      if (item.pubDate) {
        entry += `Date: ${item.pubDate}\n`;
      }
      entry += `\n${item.description}\n`;
      return entry;
    }).join("\n---\n\n");

    const links = newItems.map(item => item.link).filter(Boolean);

    return {
      url,
      title: `${feed.title || "Feed"} (${newItems.length} new items)`,
      text: text || "No new items",
      links,
      fetched_at: new Date().toISOString(),
      source_type: "rss",
    };
  }

  /**
   * Extract article links from feed content
   */
  extractLinks(content: SourceContent): string[] {
    return content.links;
  }

  /**
   * Get all configured feeds
   */
  getFeeds(): RssFeed[] {
    return this.config.feeds;
  }

  /**
   * Add a new feed subscription
   */
  addFeed(feed: RssFeed): void {
    if (!this.feedUrls.has(feed.url)) {
      this.config.feeds.push(feed);
      this.feedUrls.add(feed.url);
    }
  }

  /**
   * Remove a feed subscription
   */
  removeFeed(url: string): boolean {
    const idx = this.config.feeds.findIndex(f => f.url === url);
    if (idx >= 0) {
      this.config.feeds.splice(idx, 1);
      this.feedUrls.delete(url);
      return true;
    }
    return false;
  }

  /**
   * Check if an item has been seen
   */
  hasSeen(itemId: string): boolean {
    return this.seenTracker.has(itemId);
  }
}

/**
 * Create RSS adapter from config
 */
export function createRssAdapter(
  config?: Partial<RssSourceConfig>,
  dataDir?: string
): RssAdapter {
  return new RssAdapter(config, dataDir);
}
