/**
 * Feedback Manager - Store and retrieve user feedback on discoveries
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

export type FeedbackRating = "up" | "down";

export interface DiscoveryFeedback {
  discoveryId: string;
  rating: FeedbackRating;
  timestamp: string; // ISO timestamp
}

interface FeedbackStore {
  feedback: Record<string, DiscoveryFeedback>;
  last_updated: string;
}

export class FeedbackManager {
  private store: Record<string, DiscoveryFeedback> = {};
  private filePath: string;
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "feedback.json");
  }

  /**
   * Load feedback from disk
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await readFile(this.filePath, "utf-8");
      const parsed: FeedbackStore = JSON.parse(content);
      this.store = parsed.feedback;
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.store = {};
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Save feedback to disk
   */
  private async save(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const data: FeedbackStore = {
      feedback: this.store,
      last_updated: new Date().toISOString(),
    };

    await writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Set feedback for a discovery
   */
  async setFeedback(discoveryId: string, rating: FeedbackRating): Promise<DiscoveryFeedback> {
    await this.load();

    const feedback: DiscoveryFeedback = {
      discoveryId,
      rating,
      timestamp: new Date().toISOString(),
    };

    this.store[discoveryId] = feedback;
    await this.save();

    console.log(`[INFO] Feedback recorded: ${discoveryId} = ${rating}`);
    return feedback;
  }

  /**
   * Get feedback for a discovery
   */
  async getFeedback(discoveryId: string): Promise<DiscoveryFeedback | null> {
    await this.load();
    return this.store[discoveryId] ?? null;
  }

  /**
   * Remove feedback for a discovery
   */
  async removeFeedback(discoveryId: string): Promise<void> {
    await this.load();
    delete this.store[discoveryId];
    await this.save();
  }

  /**
   * Get all feedback entries
   */
  async getAllFeedback(): Promise<DiscoveryFeedback[]> {
    await this.load();
    return Object.values(this.store);
  }

  /**
   * Get counts of thumbs up/down
   */
  async getCounts(): Promise<{ up: number; down: number }> {
    await this.load();
    
    let up = 0;
    let down = 0;
    
    for (const feedback of Object.values(this.store)) {
      if (feedback.rating === "up") up++;
      else if (feedback.rating === "down") down++;
    }
    
    return { up, down };
  }

  /**
   * Get all discovery IDs with positive feedback
   */
  async getPositiveIds(): Promise<string[]> {
    await this.load();
    return Object.values(this.store)
      .filter((f) => f.rating === "up")
      .map((f) => f.discoveryId);
  }

  /**
   * Get all discovery IDs with negative feedback
   */
  async getNegativeIds(): Promise<string[]> {
    await this.load();
    return Object.values(this.store)
      .filter((f) => f.rating === "down")
      .map((f) => f.discoveryId);
  }
}
