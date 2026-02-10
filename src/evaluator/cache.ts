/**
 * Evaluation cache - stores LLM evaluation results to avoid re-scoring
 */

import { createHash } from "node:crypto";
import { Database } from "better-sqlite3";
import type { InterestingnessScore } from "../types.js";

export interface CachedEvaluation {
  hash: string;
  score: InterestingnessScore;
  created_at: number;
}

export class EvaluationCache {
  private db: Database;
  private ttlMs: number;

  constructor(db: Database, ttlHours: number = 24) {
    this.db = db;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
    this.initTable();
  }

  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evaluation_cache (
        hash TEXT PRIMARY KEY,
        score_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }

  /**
   * Generate a hash for content to use as cache key
   */
  hashContent(url: string, text: string): string {
    const combined = `${url}:${text.slice(0, 5000)}`;
    return createHash("sha256").update(combined).digest("hex").slice(0, 16);
  }

  /**
   * Get cached evaluation if exists and not expired
   */
  get(hash: string): InterestingnessScore | null {
    const now = Date.now();
    const cutoff = now - this.ttlMs;

    const row = this.db
      .prepare(
        "SELECT score_json, created_at FROM evaluation_cache WHERE hash = ? AND created_at > ?"
      )
      .get(hash, cutoff) as { score_json: string; created_at: number } | undefined;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.score_json) as InterestingnessScore;
    } catch {
      return null;
    }
  }

  /**
   * Store evaluation in cache
   */
  set(hash: string, score: InterestingnessScore): void {
    const now = Date.now();
    const scoreJson = JSON.stringify(score);

    this.db
      .prepare(
        "INSERT OR REPLACE INTO evaluation_cache (hash, score_json, created_at) VALUES (?, ?, ?)"
      )
      .run(hash, scoreJson, now);
  }

  /**
   * Clear expired entries
   */
  prune(): number {
    const cutoff = Date.now() - this.ttlMs;
    const result = this.db
      .prepare("DELETE FROM evaluation_cache WHERE created_at < ?")
      .run(cutoff);
    return result.changes;
  }

  /**
   * Get cache statistics
   */
  stats(): { total: number; expired: number } {
    const now = Date.now();
    const cutoff = now - this.ttlMs;

    const total = (
      this.db.prepare("SELECT COUNT(*) as count FROM evaluation_cache").get() as {
        count: number;
      }
    ).count;

    const expired = (
      this.db
        .prepare(
          "SELECT COUNT(*) as count FROM evaluation_cache WHERE created_at < ?"
        )
        .get(cutoff) as { count: number }
    ).count;

    return { total, expired };
  }
}
