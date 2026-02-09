/**
 * Explorer - Core exploration loop with parallel processing
 */

import type {
  Seed,
  ExplorationSession,
  ExplorationStep,
  ExplorationDecision,
  CuriosityConfig,
} from "../types.js";
import { ExplorationSessionManager } from "./session.js";
import { SourceRegistry } from "../sources/source_registry.js";
import { Evaluator } from "../evaluator/evaluator.js";
import { ThreadPool } from "../threads/thread_pool.js";
import { Journal } from "../journal/journal.js";
import { SeedManager } from "../seeds/seed_manager.js";
import { createDiscovery } from "../journal/discovery.js";
import { SourceFetchError } from "../sources/adapter.js";
import { RateLimiter, createConcurrencyLimiter } from "./rate_limiter.js";

export class Explorer {
  private config: CuriosityConfig;
  private sources: SourceRegistry;
  private evaluator: Evaluator;
  private threads: ThreadPool;
  private journal: Journal;
  private seeds: SeedManager;
  private rateLimiter: RateLimiter;
  private limitConcurrency: <T>(fn: () => Promise<T>) => Promise<T>;

  constructor(
    config: CuriosityConfig,
    sources: SourceRegistry,
    evaluator: Evaluator,
    threads: ThreadPool,
    journal: Journal,
    seeds: SeedManager
  ) {
    this.config = config;
    this.sources = sources;
    this.evaluator = evaluator;
    this.threads = threads;
    this.journal = journal;
    this.seeds = seeds;
    
    // Initialize rate limiter with configured delay
    this.rateLimiter = new RateLimiter(config.exploration.fetch_delay_ms);
    
    // Initialize concurrency limiter
    this.limitConcurrency = createConcurrencyLimiter(config.exploration.concurrency);
  }

  /**
   * Run exploration from a seed
   */
  async explore(seed: Seed): Promise<ExplorationSession> {
    const session = new ExplorationSessionManager(seed, this.config);
    session.start();

    console.log(`[INFO] Starting exploration for seed: ${seed.content}`);

    try {
      // Generate initial targets from seed
      let initialTargets = this.generateInitialTargets(seed);
      
      // If seed is a plain topic (not a URL), search for URLs
      if (initialTargets.length === 0) {
        initialTargets = await this.searchTopicForUrls(seed.content.trim(), 5);
      }
      
      const pendingTargets: string[] = [...initialTargets];

      console.log(`[INFO] Initial targets: ${pendingTargets.length}`);

      // Main exploration loop with parallel processing
      const concurrency = this.config.exploration.concurrency;
      console.log(`[INFO] Using concurrency level: ${concurrency}`);

      while (session.isWithinLimits() && pendingTargets.length > 0) {
        // Take a batch of targets up to concurrency limit
        const batchSize = Math.min(concurrency, pendingTargets.length);
        const batch = pendingTargets.splice(0, batchSize);
        
        // Filter to only targets we can handle
        const validTargets = batch.filter(target => {
          if (!this.sources.canHandle(target)) {
            console.log(`[DEBUG] No adapter for: ${target}`);
            return false;
          }
          return true;
        });

        if (validTargets.length === 0) continue;

        console.log(`[DEBUG] Processing batch of ${validTargets.length} targets`);

        // Process targets concurrently with rate limiting
        const results = await Promise.allSettled(
          validTargets.map(target => this.processTarget(target, seed, session))
        );

        // Collect new links from successful results
        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const { newLinks, threadLinks } = result.value;
            
            // Add new links to pending (avoiding duplicates)
            for (const link of newLinks) {
              if (!pendingTargets.includes(link)) {
                pendingTargets.push(link);
              }
            }
            
            // Add thread links to pool
            for (const threadInfo of threadLinks) {
              await this.threads.add(
                threadInfo.link,
                threadInfo.context,
                session.getId(),
                threadInfo.depth,
                threadInfo.score
              );
            }
          }
        }
      }

      // Complete session
      if (!session.isWithinLimits()) {
        console.log(`[INFO] Session reached limits`);
        session.timeout();
      } else {
        session.complete();
      }

      // Update seed
      await this.seeds.markExplored(seed.id);

      // Save session
      await session.save(this.config.data_dir);

      const result = session.getSession();
      console.log(
        `[INFO] Exploration complete: ${result.discoveries.length} discoveries, ${result.new_threads.length} new threads`
      );

      return result;
    } catch (error) {
      console.log(`[ERROR] Exploration failed: ${error}`);
      session.error(error instanceof Error ? error : new Error(String(error)));
      await session.save(this.config.data_dir);
      return session.getSession();
    }
  }

  /**
   * Process a single target URL
   * Returns new links to explore and thread info to queue
   */
  private async processTarget(
    target: string,
    seed: Seed,
    session: ExplorationSessionManager
  ): Promise<{
    newLinks: string[];
    threadLinks: Array<{ link: string; context: string; depth: number; score: number }>;
  } | null> {
    console.log(`[DEBUG] Exploring: ${target}`);

    try {
      // Rate limit per domain
      await this.rateLimiter.acquire(target);

      // Fetch content with concurrency limit
      const content = await this.limitConcurrency(() => this.sources.fetch(target));
      console.log(`[DEBUG] Fetched: ${content.title}`);

      // Evaluate content
      const score = await this.evaluator.evaluate(content);
      console.log(
        `[DEBUG] Score: ${score.overall.toFixed(2)} (novelty: ${score.novelty.toFixed(2)}, connections: ${score.connection_potential.toFixed(2)})`
      );

      // Determine decision
      let decision: ExplorationDecision;
      if (score.overall >= this.config.interestingness.follow_threshold) {
        decision = "follow" as ExplorationDecision;
      } else {
        decision = "stop" as ExplorationDecision;
      }

      // Record step
      const step: ExplorationStep = {
        depth: session.getPathTracker().getDepth() + 1,
        url: target,
        content_summary: content.title || content.text.slice(0, 100),
        interestingness_score: score.overall,
        decision,
        reasoning: `Overall score ${score.overall.toFixed(2)} ${decision === "follow" ? ">=" : "<"} threshold ${this.config.interestingness.follow_threshold}`,
      };
      session.addStep(step);

      // Create discovery if threshold met
      if (score.overall >= this.config.interestingness.discovery_threshold) {
        console.log(`[INFO] Discovery found: ${content.title}`);

        const discovery = createDiscovery({
          sessionId: session.getId(),
          seedPath: [seed.content, ...session.getPathTracker().toSeedPath()],
          title: content.title || "Untitled Discovery",
          content: content.text.slice(0, 2000),
          significance: score.overall,
          connections: [],
          questions: this.extractQuestions(content.text),
          tags: [],
        });

        session.addDiscovery(discovery);
        await this.journal.add(discovery);
      }

      // Collect links if following
      const newLinks: string[] = [];
      const threadLinks: Array<{ link: string; context: string; depth: number; score: number }> = [];

      if (decision === "follow") {
        const links = this.sources.extractLinks(content, target);
        const scoredLinks = links.slice(0, 10); // Limit links to process

        for (const link of scoredLinks) {
          // Add to pending or thread pool based on depth
          if (session.getPathTracker().getDepth() < this.config.exploration.max_depth - 1) {
            newLinks.push(link);
          } else {
            threadLinks.push({
              link,
              context: `From: ${content.title}`,
              depth: session.getPathTracker().getDepth(),
              score: score.overall * 0.8,
            });
          }
        }
      }

      return { newLinks, threadLinks };
    } catch (error) {
      if (error instanceof SourceFetchError) {
        console.log(`[WARN] Fetch failed for ${target}: ${error.message}`);
      } else {
        console.log(`[WARN] Error processing ${target}: ${error}`);
      }
      return null;
    }
  }

  /**
   * Generate initial targets from seed content
   */
  private generateInitialTargets(seed: Seed): string[] {
    const content = seed.content.trim();

    // If seed is a URL, use it directly
    if (content.startsWith("http://") || content.startsWith("https://")) {
      return [content];
    }

    // For plain topics, we'll search DuckDuckGo and extract URLs
    // This is handled asynchronously in explore() via searchTopicForUrls()
    // Return empty here - the explore method will call searchTopicForUrls
    return [];
  }

  /**
   * Search DuckDuckGo for a topic and extract top result URLs
   */
  private async searchTopicForUrls(topic: string, limit: number = 5): Promise<string[]> {
    const query = encodeURIComponent(topic);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;

    console.log(`[INFO] Searching DuckDuckGo for topic: ${topic}`);

    try {
      const content = await this.sources.fetch(searchUrl);
      
      // Extract result URLs from DuckDuckGo HTML
      // DuckDuckGo HTML search results have links in <a class="result__url"> or similar
      const urls = this.extractDuckDuckGoResults(content.text, content.links, limit);
      
      console.log(`[INFO] Found ${urls.length} URLs for topic "${topic}"`);
      return urls;
    } catch (error) {
      console.log(`[WARN] Failed to search for topic: ${error}`);
      // Fallback: return the search page itself
      return [searchUrl];
    }
  }

  /**
   * Extract actual result URLs from DuckDuckGo HTML response
   */
  private extractDuckDuckGoResults(text: string, links: string[], limit: number): string[] {
    const results: string[] = [];
    
    // Filter links to find actual result URLs (not DuckDuckGo internal links)
    for (const link of links) {
      // Skip DuckDuckGo internal links
      if (link.includes("duckduckgo.com")) continue;
      if (link.startsWith("/")) continue;
      if (link.includes("duck.co")) continue;
      
      // Skip common non-content URLs
      if (link.includes("javascript:")) continue;
      if (link.includes("mailto:")) continue;
      
      // Must be http/https
      if (!link.startsWith("http://") && !link.startsWith("https://")) continue;
      
      // Avoid duplicates
      if (!results.includes(link)) {
        results.push(link);
      }
      
      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Extract questions from text
   */
  private extractQuestions(text: string): string[] {
    const sentences = text.split(/[.!?]+/);
    const questions: string[] = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.includes("?") || this.looksLikeQuestion(trimmed)) {
        if (trimmed.length > 10 && trimmed.length < 200) {
          questions.push(trimmed + "?");
        }
      }
    }

    return questions.slice(0, 5); // Limit to 5 questions
  }

  /**
   * Check if text looks like a question
   */
  private looksLikeQuestion(text: string): boolean {
    const questionStarters = [
      "what",
      "why",
      "how",
      "when",
      "where",
      "who",
      "which",
      "could",
      "would",
      "should",
      "is there",
      "are there",
      "can",
      "does",
      "do",
    ];
    const lower = text.toLowerCase();
    return questionStarters.some((starter) => lower.startsWith(starter));
  }
}
