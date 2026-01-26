/**
 * Scheduler - Timing logic for exploration
 *
 * TODO: Implement full scheduling logic
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

interface SchedulerState {
  last_explore_time: string | null;
  last_digest_time: string | null;
}

export class Scheduler {
  private state: SchedulerState = {
    last_explore_time: null,
    last_digest_time: null,
  };
  private filePath: string;
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "scheduler.json");
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
   * Check if exploration should run
   */
  async shouldExplore(): Promise<boolean> {
    // TODO: Implement proper scheduling logic
    // For now, always return true
    return true;
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
