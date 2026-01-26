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

Options:
  --help, -h               Show this help

Examples:
  curiosity explore "Why do we dream?"
  curiosity explore https://example.com/interesting-article
  curiosity add-seed "How do neural networks learn?"
  curiosity list-seeds --status active
  curiosity digest --since 2024-01-01
  curiosity status
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

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
