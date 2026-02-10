/**
 * Scheduler - Timing logic for exploration
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Default minimum interval between explorations (in milliseconds)
const DEFAULT_EXPLORE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SchedulerState {
  last_explore_time: string | null;
  last_digest_time: string | null;
}

interface SchedulerConfig {
  explore_interval_ms?: number;
  digest_interval_ms?: number;
}

export class Scheduler {
  private state: SchedulerState = {
    last_explore_time: null,
    last_digest_time: null,
  };
  private filePath: string;
  private loaded = false;
  private config: Required<SchedulerConfig>;

  constructor(dataDir: string, config: SchedulerConfig = {}) {
    this.filePath = join(dataDir, "scheduler.json");
    this.config = {
      explore_interval_ms: config.explore_interval_ms ?? DEFAULT_EXPLORE_INTERVAL_MS,
      digest_interval_ms: config.digest_interval_ms ?? DEFAULT_DIGEST_INTERVAL_MS,
    };
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await readFile(this.filePath, "utf-8");
      this.state = JSON.parse(content);
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  async save(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Check if exploration should run based on time since last exploration
   */
  async shouldExplore(): Promise<boolean> {
    const lastTime = await this.getLastExploreTime();
    if (!lastTime) {
      return true; // Never explored before
    }

    const elapsed = Date.now() - lastTime.getTime();
    return elapsed >= this.config.explore_interval_ms;
  }

  /**
   * Check if digest should be sent based on time since last digest
   */
  async shouldDigest(): Promise<boolean> {
    const lastTime = await this.getLastDigestTime();
    if (!lastTime) {
      return true; // Never sent digest before
    }

    const elapsed = Date.now() - lastTime.getTime();
    return elapsed >= this.config.digest_interval_ms;
  }

  /**
   * Get last exploration time
   */
  async getLastExploreTime(): Promise<Date | null> {
    await this.load();
    if (!this.state.last_explore_time) return null;
    return new Date(this.state.last_explore_time);
  }

  /**
   * Record that exploration occurred
   */
  async recordExplore(): Promise<void> {
    await this.load();
    this.state.last_explore_time = new Date().toISOString();
    await this.save();
  }

  /**
   * Get last digest time
   */
  async getLastDigestTime(): Promise<Date | null> {
    await this.load();
    if (!this.state.last_digest_time) return null;
    return new Date(this.state.last_digest_time);
  }

  /**
   * Record that digest was sent
   */
  async recordDigest(): Promise<void> {
    await this.load();
    this.state.last_digest_time = new Date().toISOString();
    await this.save();
  }
}
