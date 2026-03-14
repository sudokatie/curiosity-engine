#!/usr/bin/env node

/**
 * Curiosity Engine - CLI Entry Point
 */

import { getConfig } from "./config.js";
import { SeedManager } from "./seeds/seed_manager.js";
import { ThreadPool } from "./threads/thread_pool.js";
import { Journal } from "./journal/journal.js";
import { SourceRegistry } from "./sources/source_registry.js";
import { WebAdapter } from "./sources/web_adapter.js";
import { RssAdapter } from "./sources/rss_adapter.js";
import { createChainExplorer } from "./explorer/chain_explorer.js";
import { Evaluator } from "./evaluator/evaluator.js";
import { Explorer } from "./explorer/explorer.js";
import { Reporter } from "./reporter/reporter.js";
import { Scheduler } from "./scheduler/scheduler.js";
import { SeedSource, SeedStatus } from "./types.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  try {
    const config = getConfig();

    switch (command) {
      case "explore":
        await cmdExplore(args.slice(1), config);
        break;

      case "add-seed":
        await cmdAddSeed(args.slice(1), config);
        break;

      case "list-seeds":
        await cmdListSeeds(args.slice(1), config);
        break;

      case "digest":
        await cmdDigest(args.slice(1), config);
        break;

      case "status":
        await cmdStatus(config);
        break;

      case "rss-add":
        await cmdRssAdd(args.slice(1), config);
        break;

      case "rss-list":
        await cmdRssList(config);
        break;

      case "rss-poll":
        await cmdRssPoll(config);
        break;

      case "rss-remove":
        await cmdRssRemove(args.slice(1), config);
        break;

      case "chain":
        await cmdChain(args.slice(1), config);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run with --help for usage');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
Curiosity Engine - Autonomous exploration system

Usage: curiosity <command> [options]

Commands:
  explore <seed>           Explore from a seed (URL or topic)
  add-seed <content>       Add a new seed to the pool
  list-seeds [--status X]  List seeds (optionally filter by status)
  digest [--since DATE]    Generate discovery digest
  status                   Show system status

RSS Feed Commands:
  rss-add <url> [--name N] Add an RSS/Atom feed subscription
  rss-list                 List subscribed feeds
  rss-poll                 Poll all feeds for new items
  rss-remove <url>         Remove a feed subscription

Chain Exploration:
  chain [options]          Follow links between discoveries
    --max-depth N          Maximum chain depth (default: 3)
    --max-links N          Maximum links to explore (default: 20)
    --min-priority N       Minimum priority threshold (default: 0.3)
    --since DATE           Only consider discoveries since date

Options:
  --help, -h               Show this help

Examples:
  curiosity explore "Why do we dream?"
  curiosity explore https://example.com/interesting-article
  curiosity add-seed "How do neural networks learn?"
  curiosity list-seeds --status active
  curiosity digest --since 2024-01-01
  curiosity status
  curiosity rss-add https://blog.example.com/feed.xml --name "Tech Blog"
  curiosity rss-poll
`);
}

async function cmdExplore(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const seedContent = args.join(" ").trim();

  if (!seedContent) {
    console.error("Error: Please provide a seed to explore");
    console.error("Usage: curiosity explore <seed>");
    process.exit(1);
  }

  // Initialize components
  const seeds = new SeedManager(config.data_dir);
  const threads = new ThreadPool(config.data_dir);
  const journal = new Journal(config.data_dir);
  const scheduler = new Scheduler(config.data_dir);

  const sources = new SourceRegistry();
  sources.register(
    new WebAdapter(config.sources.web, {
      fetchDelayMs: config.exploration.fetch_delay_ms,
      timeoutMs: config.exploration.source_timeout_ms,
    })
  );
  
  // Register RSS adapter if configured
  if (config.sources.rss?.enabled) {
    sources.register(new RssAdapter(config.sources.rss, config.data_dir));
  }

  const evaluator = new Evaluator(config);
  const explorer = new Explorer(
    config,
    sources,
    evaluator,
    threads,
    journal,
    seeds
  );

  // Create seed and explore
  const seed = await seeds.add(seedContent, SeedSource.USER_INPUT);
  console.log(`Created seed: ${seed.id}`);

  const session = await explorer.explore(seed);
  await scheduler.recordExplore();

  // Print summary
  console.log("\n--- Exploration Summary ---");
  console.log(`Status: ${session.status}`);
  console.log(`Depth reached: ${session.current_depth}`);
  console.log(`Discoveries: ${session.discoveries.length}`);
  console.log(`New threads: ${session.new_threads.length}`);

  if (session.discoveries.length > 0) {
    console.log("\nDiscoveries:");
    for (const d of session.discoveries) {
      console.log(`  - ${d.title} (${(d.significance * 100).toFixed(0)}%)`);
    }
  }
}

async function cmdAddSeed(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const content = args.join(" ").trim();

  if (!content) {
    console.error("Error: Please provide seed content");
    console.error("Usage: curiosity add-seed <content>");
    process.exit(1);
  }

  const seeds = new SeedManager(config.data_dir);
  const seed = await seeds.add(content, SeedSource.USER_INPUT);

  console.log(`Seed added: ${seed.id}`);
  console.log(`Content: ${seed.content}`);
}

async function cmdListSeeds(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  let status: SeedStatus | undefined;

  // Parse --status flag
  const statusIdx = args.indexOf("--status");
  if (statusIdx !== -1 && args[statusIdx + 1]) {
    const statusArg = args[statusIdx + 1].toLowerCase();
    if (["active", "deferred", "exhausted"].includes(statusArg)) {
      status = statusArg as SeedStatus;
    }
  }

  const seeds = new SeedManager(config.data_dir);
  const list = await seeds.list(status);

  if (list.length === 0) {
    console.log("No seeds found");
    return;
  }

  console.log(`Seeds (${list.length}):\n`);
  console.log("ID                                   | Status    | Priority | Explored | Content");
  console.log("-".repeat(100));

  for (const seed of list) {
    const id = seed.id.slice(0, 36);
    const st = seed.status.padEnd(9);
    const pr = seed.priority.toFixed(1).padStart(8);
    const ex = String(seed.times_explored).padStart(8);
    const content = seed.content.slice(0, 30);
    console.log(`${id} | ${st} | ${pr} | ${ex} | ${content}`);
  }
}

async function cmdDigest(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  let since: Date | undefined;

  // Parse --since flag
  const sinceIdx = args.indexOf("--since");
  if (sinceIdx !== -1 && args[sinceIdx + 1]) {
    since = new Date(args[sinceIdx + 1]);
    if (isNaN(since.getTime())) {
      console.error("Error: Invalid date format");
      process.exit(1);
    }
  }

  const journal = new Journal(config.data_dir);
  const reporter = new Reporter(config, journal);

  await reporter.sendDigest(since);
}

async function cmdStatus(
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const seeds = new SeedManager(config.data_dir);
  const threads = new ThreadPool(config.data_dir);
  const journal = new Journal(config.data_dir);
  const scheduler = new Scheduler(config.data_dir);

  const seedCount = await seeds.count();
  const activeSeeds = await seeds.count(SeedStatus.ACTIVE);
  const threadCount = await threads.count();
  const pendingThreads = await threads.count("pending" as any);
  const discoveryCount = await journal.count();
  const lastExplore = await scheduler.getLastExploreTime();

  console.log("Curiosity Engine Status\n");
  console.log(`Seeds:       ${seedCount} total, ${activeSeeds} active`);
  console.log(`Threads:     ${threadCount} total, ${pendingThreads} pending`);
  console.log(`Discoveries: ${discoveryCount}`);
  console.log(
    `Last explore: ${lastExplore ? lastExplore.toLocaleString() : "never"}`
  );
}

// RSS Feed Commands

async function cmdRssAdd(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const url = args.find(a => !a.startsWith("--"));
  
  if (!url) {
    console.error("Error: Please provide a feed URL");
    console.error("Usage: curiosity rss-add <url> [--name NAME]");
    process.exit(1);
  }

  // Parse --name flag
  const nameIdx = args.indexOf("--name");
  const name = nameIdx !== -1 ? args[nameIdx + 1] : undefined;

  const adapter = new RssAdapter(config.sources.rss, config.data_dir);
  
  // Try to fetch the feed to validate it
  try {
    const feedUrl = url.startsWith("rss://") ? url : `rss://${url.replace(/^https?:\/\//, "")}`;
    const content = await adapter.fetch(feedUrl);
    console.log(`Feed validated: ${content.title}`);
  } catch (error) {
    console.error(`Error: Could not fetch feed - ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  adapter.addFeed({ url, name });
  console.log(`Added feed: ${name || url}`);
  console.log("\nNote: Feed subscriptions are stored in memory. Add to config/local.yaml for persistence.");
}

async function cmdRssList(
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const rssConfig = config.sources.rss;
  
  if (!rssConfig?.enabled) {
    console.log("RSS feeds are disabled. Enable in config/local.yaml:");
    console.log("  sources:");
    console.log("    rss:");
    console.log("      enabled: true");
    console.log("      feeds:");
    console.log('        - url: "https://example.com/feed.xml"');
    return;
  }

  const feeds = rssConfig.feeds || [];
  
  if (feeds.length === 0) {
    console.log("No RSS feeds configured.");
    console.log("\nAdd feeds to config/local.yaml:");
    console.log("  sources:");
    console.log("    rss:");
    console.log("      enabled: true");
    console.log("      feeds:");
    console.log('        - url: "https://example.com/feed.xml"');
    console.log('          name: "Example Blog"');
    return;
  }

  console.log(`RSS Feeds (${feeds.length}):\n`);
  for (const feed of feeds) {
    const name = feed.name || "(unnamed)";
    const interval = feed.poll_interval_minutes || rssConfig.default_poll_interval_minutes;
    console.log(`  ${name}`);
    console.log(`    URL: ${feed.url}`);
    console.log(`    Poll interval: ${interval} minutes`);
    console.log();
  }
}

async function cmdRssPoll(
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const rssConfig = config.sources.rss;
  
  if (!rssConfig?.enabled) {
    console.error("RSS feeds are disabled. Enable in config first.");
    process.exit(1);
  }

  const feeds = rssConfig.feeds || [];
  
  if (feeds.length === 0) {
    console.log("No RSS feeds configured.");
    return;
  }

  const adapter = new RssAdapter(rssConfig, config.data_dir);
  const seeds = new SeedManager(config.data_dir);
  
  let totalNewItems = 0;

  console.log(`Polling ${feeds.length} feeds...\n`);

  for (const feed of feeds) {
    const name = feed.name || feed.url;
    try {
      const feedUrl = feed.url.startsWith("rss://") 
        ? feed.url 
        : `rss://${feed.url.replace(/^https?:\/\//, "")}`;
      
      const content = await adapter.fetch(feedUrl);
      const newItems = content.links.length;
      
      if (newItems > 0) {
        console.log(`  ${name}: ${newItems} new items`);
        
        // Create seeds from new items
        for (const link of content.links) {
          await seeds.add(link, SeedSource.OBSERVATION, `RSS: ${name}`);
        }
        totalNewItems += newItems;
      } else {
        console.log(`  ${name}: no new items`);
      }
    } catch (error) {
      console.error(`  ${name}: ERROR - ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\nTotal: ${totalNewItems} new items added as seeds`);
}

async function cmdRssRemove(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  const url = args[0];
  
  if (!url) {
    console.error("Error: Please provide a feed URL to remove");
    console.error("Usage: curiosity rss-remove <url>");
    process.exit(1);
  }

  console.log(`To remove feed "${url}", edit config/local.yaml and remove the feed entry.`);
  console.log("\nFeed subscriptions are persisted in the config file.");
}

// Chain Exploration Command

async function cmdChain(
  args: string[],
  config: ReturnType<typeof getConfig>
): Promise<void> {
  // Parse options
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const maxDepth = parseInt(getArg("--max-depth") || "3", 10);
  const maxLinks = parseInt(getArg("--max-links") || "20", 10);
  const minPriority = parseFloat(getArg("--min-priority") || "0.3");
  const sinceArg = getArg("--since");
  const since = sinceArg ? new Date(sinceArg) : undefined;

  if (since && isNaN(since.getTime())) {
    console.error("Error: Invalid date format for --since");
    process.exit(1);
  }

  // Initialize components
  const seeds = new SeedManager(config.data_dir);
  const threads = new ThreadPool(config.data_dir);
  const journal = new Journal(config.data_dir);

  const sources = new SourceRegistry();
  sources.register(
    new WebAdapter(config.sources.web, {
      fetchDelayMs: config.exploration.fetch_delay_ms,
      timeoutMs: config.exploration.source_timeout_ms,
    })
  );

  if (config.sources.rss?.enabled) {
    sources.register(new RssAdapter(config.sources.rss, config.data_dir));
  }

  const evaluator = new Evaluator(config);

  // Create chain explorer
  const chainExplorer = createChainExplorer(
    config,
    { maxDepth, maxLinks, minPriority, since },
    journal,
    sources,
    evaluator,
    threads,
    seeds
  );

  console.log("Starting chain exploration...\n");
  console.log(`Options: maxDepth=${maxDepth}, maxLinks=${maxLinks}, minPriority=${minPriority}`);
  if (since) {
    console.log(`Only considering discoveries since: ${since.toISOString()}`);
  }
  console.log();

  // Run chain exploration
  const result = await chainExplorer.explore();

  // Print summary
  console.log("\n--- Chain Exploration Summary ---");
  console.log(`Links explored: ${result.linksExplored}`);
  console.log(`New discoveries: ${result.newDiscoveries}`);
  console.log(`Sessions created: ${result.sessions.length}`);

  if (result.newDiscoveries > 0) {
    console.log("\nNew discoveries:");
    for (const session of result.sessions) {
      for (const d of session.discoveries) {
        console.log(`  - ${d.title} (${(d.significance * 100).toFixed(0)}%)`);
      }
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
