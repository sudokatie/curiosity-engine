/**
 * Chain Explorer - Follow links between discoveries automatically
 * 
 * Extracts links from discovery content and explores them with
 * priority based on source discovery significance.
 */

import type { Discovery, CuriosityConfig, ExplorationSession } from "../types.js";
import { Journal } from "../journal/journal.js";
import { SourceRegistry } from "../sources/source_registry.js";
import { Evaluator } from "../evaluator/evaluator.js";
import { ThreadPool } from "../threads/thread_pool.js";
import { SeedManager } from "../seeds/seed_manager.js";
import { Explorer } from "./explorer.js";
import { SeedSource } from "../types.js";

/**
 * A link extracted from a discovery with its priority
 */
export interface ChainLink {
  url: string;
  sourceDiscoveryId: string;
  sourceTitle: string;
  priority: number; // 0-1, based on source discovery significance
  depth: number;
}

/**
 * Priority queue for chain links
 */
export class ChainPriorityQueue {
  private links: ChainLink[] = [];
  private seen: Set<string> = new Set();

  /**
   * Add a link to the queue if not seen
   */
  add(link: ChainLink): boolean {
    if (this.seen.has(link.url)) {
      return false;
    }
    this.seen.add(link.url);
    this.links.push(link);
    // Sort by priority descending
    this.links.sort((a, b) => b.priority - a.priority);
    return true;
  }

  /**
   * Add multiple links
   */
  addAll(links: ChainLink[]): number {
    let added = 0;
    for (const link of links) {
      if (this.add(link)) added++;
    }
    return added;
  }

  /**
   * Get and remove the highest priority link
   */
  pop(): ChainLink | undefined {
    return this.links.shift();
  }

  /**
   * Peek at the highest priority link without removing
   */
  peek(): ChainLink | undefined {
    return this.links[0];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.links.length;
  }

  /**
   * Check if empty
   */
  isEmpty(): boolean {
    return this.links.length === 0;
  }

  /**
   * Check if URL has been seen
   */
  hasSeen(url: string): boolean {
    return this.seen.has(url);
  }

  /**
   * Get all links (for inspection)
   */
  getAll(): ChainLink[] {
    return [...this.links];
  }
}

/**
 * Extract URLs from text content
 */
export function extractUrlsFromText(text: string): string[] {
  const urls: string[] = [];
  
  // Match http/https URLs
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = text.match(urlRegex) || [];
  
  for (const match of matches) {
    // Clean up trailing punctuation
    let url = match.replace(/[.,;:!?)]+$/, "");
    
    // Skip if too short
    if (url.length < 10) continue;
    
    // Skip common non-content URLs
    if (url.includes("javascript:")) continue;
    if (url.includes("mailto:")) continue;
    if (url.includes("tel:")) continue;
    
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  
  return urls;
}

/**
 * Extract chain links from a discovery
 */
export function extractChainLinks(
  discovery: Discovery,
  depth: number = 0
): ChainLink[] {
  const urls = extractUrlsFromText(discovery.content);
  
  return urls.map(url => ({
    url,
    sourceDiscoveryId: discovery.id,
    sourceTitle: discovery.title,
    priority: discovery.significance * Math.pow(0.8, depth), // Decay by depth
    depth,
  }));
}

/**
 * Configuration for chain exploration
 */
export interface ChainExplorationConfig {
  maxDepth: number;       // Maximum chain depth to follow
  maxLinks: number;       // Maximum total links to explore
  minPriority: number;    // Minimum priority to explore
  since?: Date;           // Only consider discoveries since this date
}

const DEFAULT_CHAIN_CONFIG: ChainExplorationConfig = {
  maxDepth: 3,
  maxLinks: 20,
  minPriority: 0.3,
};

/**
 * Chain Explorer - Follows links between discoveries
 */
export class ChainExplorer {
  private config: CuriosityConfig;
  private chainConfig: ChainExplorationConfig;
  private journal: Journal;
  private sources: SourceRegistry;
  private evaluator: Evaluator;
  private threads: ThreadPool;
  private seeds: SeedManager;

  constructor(
    config: CuriosityConfig,
    chainConfig: Partial<ChainExplorationConfig>,
    journal: Journal,
    sources: SourceRegistry,
    evaluator: Evaluator,
    threads: ThreadPool,
    seeds: SeedManager
  ) {
    this.config = config;
    this.chainConfig = { ...DEFAULT_CHAIN_CONFIG, ...chainConfig };
    this.journal = journal;
    this.sources = sources;
    this.evaluator = evaluator;
    this.threads = threads;
    this.seeds = seeds;
  }

  /**
   * Build initial chain links from existing discoveries
   */
  async buildInitialQueue(): Promise<ChainPriorityQueue> {
    const queue = new ChainPriorityQueue();
    
    // Get recent discoveries
    const discoveries = await this.journal.list({
      since: this.chainConfig.since,
      limit: 100,
    });

    console.log(`[Chain] Found ${discoveries.length} discoveries to extract links from`);

    // Extract links from each discovery
    for (const discovery of discoveries) {
      const links = extractChainLinks(discovery, 0);
      const added = queue.addAll(links);
      if (added > 0) {
        console.log(`[Chain] Extracted ${added} links from "${discovery.title}"`);
      }
    }

    return queue;
  }

  /**
   * Run chain exploration
   */
  async explore(): Promise<{
    linksExplored: number;
    newDiscoveries: number;
    sessions: ExplorationSession[];
  }> {
    const queue = await this.buildInitialQueue();
    
    console.log(`[Chain] Starting with ${queue.size()} links in queue`);
    console.log(`[Chain] Config: maxDepth=${this.chainConfig.maxDepth}, maxLinks=${this.chainConfig.maxLinks}, minPriority=${this.chainConfig.minPriority}`);

    const sessions: ExplorationSession[] = [];
    let linksExplored = 0;
    let newDiscoveries = 0;

    // Create explorer instance
    const explorer = new Explorer(
      this.config,
      this.sources,
      this.evaluator,
      this.threads,
      this.journal,
      this.seeds
    );

    // Process links from queue
    while (!queue.isEmpty() && linksExplored < this.chainConfig.maxLinks) {
      const link = queue.pop()!;

      // Skip if below priority threshold
      if (link.priority < this.chainConfig.minPriority) {
        console.log(`[Chain] Skipping ${link.url} (priority ${link.priority.toFixed(2)} < ${this.chainConfig.minPriority})`);
        continue;
      }

      // Skip if beyond depth limit
      if (link.depth >= this.chainConfig.maxDepth) {
        console.log(`[Chain] Skipping ${link.url} (depth ${link.depth} >= ${this.chainConfig.maxDepth})`);
        continue;
      }

      // Skip if no adapter can handle it
      if (!this.sources.canHandle(link.url)) {
        console.log(`[Chain] Skipping ${link.url} (no adapter)`);
        continue;
      }

      console.log(`[Chain] Exploring: ${link.url} (priority=${link.priority.toFixed(2)}, depth=${link.depth}, from="${link.sourceTitle}")`);

      try {
        // Create a seed from this link
        const seed = await this.seeds.add(
          link.url,
          SeedSource.DISCOVERY,
          `Chain from: ${link.sourceTitle}`
        );

        // Explore it
        const session = await explorer.explore(seed);
        sessions.push(session);
        linksExplored++;

        // Count new discoveries
        const discoveryCount = session.discoveries.length;
        newDiscoveries += discoveryCount;

        // Extract links from new discoveries and add to queue
        for (const discovery of session.discoveries) {
          const newLinks = extractChainLinks(discovery, link.depth + 1);
          const added = queue.addAll(newLinks);
          if (added > 0) {
            console.log(`[Chain] Added ${added} new links from discovery "${discovery.title}"`);
          }
        }
      } catch (error) {
        console.log(`[Chain] Error exploring ${link.url}: ${error}`);
      }
    }

    console.log(`[Chain] Complete: ${linksExplored} links explored, ${newDiscoveries} new discoveries`);

    return {
      linksExplored,
      newDiscoveries,
      sessions,
    };
  }
}

/**
 * Create a chain explorer instance
 */
export function createChainExplorer(
  config: CuriosityConfig,
  chainConfig: Partial<ChainExplorationConfig>,
  journal: Journal,
  sources: SourceRegistry,
  evaluator: Evaluator,
  threads: ThreadPool,
  seeds: SeedManager
): ChainExplorer {
  return new ChainExplorer(
    config,
    chainConfig,
    journal,
    sources,
    evaluator,
    threads,
    seeds
  );
}
