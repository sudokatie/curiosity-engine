/**
 * Journal - Store and retrieve discoveries
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Discovery } from "../types.js";
import { discoveryToMarkdown } from "./markdown.js";

interface JournalIndex {
  discoveries: Discovery[];
  last_updated: string;
}

/**
 * Normalize a URL for deduplication comparison.
 * Strips fragments (#...) and trailing slashes.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove fragment
    parsed.hash = "";
    // Get href and strip trailing slash (but not for root paths)
    let normalized = parsed.href;
    if (normalized.endsWith("/") && parsed.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized.toLowerCase();
  } catch {
    // If not a valid URL, just normalize as-is
    return url.toLowerCase().replace(/#.*$/, "").replace(/\/$/, "");
  }
}

/**
 * Extract URL from discovery seed_path (first URL found) or title
 */
function extractDiscoveryUrl(discovery: Discovery): string | null {
  // Check seed_path for URLs
  for (const segment of discovery.seed_path) {
    if (segment.startsWith("http://") || segment.startsWith("https://")) {
      return segment;
    }
  }
  return null;
}

export class Journal {
  private index: Discovery[] = [];
  private indexPath: string;
  private journalDir: string;
  private loaded = false;
  private urlIndex: Map<string, string> = new Map(); // normalized URL -> discovery ID
  private titleIndex: Map<string, string> = new Map(); // normalized title -> discovery ID

  constructor(dataDir: string) {
    this.journalDir = join(dataDir, "journal");
    this.indexPath = join(this.journalDir, "index.json");
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await readFile(this.indexPath, "utf-8");
      const parsed: JournalIndex = JSON.parse(content);
      this.index = parsed.discoveries;
      
      // Build URL index for deduplication
      this.buildUrlIndex();
      
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.index = [];
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Normalize a title for deduplication
   */
  private normalizeTitle(title: string): string {
    return title.toLowerCase().trim();
  }

  /**
   * Build the URL and title indexes from existing discoveries
   */
  private buildUrlIndex(): void {
    this.urlIndex.clear();
    this.titleIndex.clear();
    for (const discovery of this.index) {
      // Index by URL
      const url = extractDiscoveryUrl(discovery);
      if (url) {
        const normalized = normalizeUrl(url);
        this.urlIndex.set(normalized, discovery.id);
      }
      // Index by title
      const normalizedTitle = this.normalizeTitle(discovery.title);
      if (!this.titleIndex.has(normalizedTitle)) {
        this.titleIndex.set(normalizedTitle, discovery.id);
      }
    }
  }

  /**
   * Check if a discovery with the same URL already exists
   */
  hasUrl(url: string): boolean {
    const normalized = normalizeUrl(url);
    return this.urlIndex.has(normalized);
  }

  /**
   * Get existing discovery ID for a URL, if any
   */
  getByUrl(url: string): string | null {
    const normalized = normalizeUrl(url);
    return this.urlIndex.get(normalized) ?? null;
  }

  private async saveIndex(): Promise<void> {
    if (!existsSync(this.journalDir)) {
      await mkdir(this.journalDir, { recursive: true });
    }

    const indexData: JournalIndex = {
      discoveries: this.index,
      last_updated: new Date().toISOString(),
    };

    await writeFile(this.indexPath, JSON.stringify(indexData, null, 2));
  }

  async add(discovery: Discovery): Promise<void> {
    await this.load();

    // Check for duplicate URL
    const url = extractDiscoveryUrl(discovery);
    if (url) {
      const normalized = normalizeUrl(url);
      if (this.urlIndex.has(normalized)) {
        console.log(`[INFO] Skipping duplicate discovery for URL: ${url}`);
        return; // Skip duplicate
      }
    }

    // Check for duplicate title (catches redirects and fragments)
    const normalizedTitle = this.normalizeTitle(discovery.title);
    if (this.titleIndex.has(normalizedTitle)) {
      console.log(`[INFO] Skipping duplicate discovery for title: ${discovery.title}`);
      return; // Skip duplicate
    }

    // Add to indexes
    if (url) {
      this.urlIndex.set(normalizeUrl(url), discovery.id);
    }
    this.titleIndex.set(normalizedTitle, discovery.id);

    // Add to index
    this.index.push(discovery);

    // Write markdown file
    const mdPath = join(this.journalDir, `${discovery.id}.md`);
    const markdown = discoveryToMarkdown(discovery);
    await writeFile(mdPath, markdown);

    // Save index
    await this.saveIndex();
  }

  async getById(id: string): Promise<Discovery | null> {
    await this.load();
    return this.index.find((d) => d.id === id) ?? null;
  }

  async list(options?: {
    limit?: number;
    since?: Date;
    minSignificance?: number;
  }): Promise<Discovery[]> {
    await this.load();

    let results = [...this.index];

    // Filter by date
    if (options?.since) {
      const sinceTime = options.since.getTime();
      results = results.filter(
        (d) => new Date(d.created_at).getTime() >= sinceTime
      );
    }

    // Filter by significance
    if (options?.minSignificance !== undefined) {
      results = results.filter(
        (d) => d.significance >= options.minSignificance!
      );
    }

    // Sort by date DESC
    results.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply limit
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async search(query: string): Promise<Discovery[]> {
    await this.load();

    const lowerQuery = query.toLowerCase();
    return this.index.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.content.toLowerCase().includes(lowerQuery) ||
        d.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  async count(): Promise<number> {
    await this.load();
    return this.index.length;
  }

  async getRecent(limit: number = 10): Promise<Discovery[]> {
    return this.list({ limit });
  }

  async getTopBySignificance(limit: number = 10): Promise<Discovery[]> {
    await this.load();

    return [...this.index]
      .sort((a, b) => b.significance - a.significance)
      .slice(0, limit);
  }
}
