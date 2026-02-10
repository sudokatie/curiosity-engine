/**
 * Thread Pool - Manage pool of unexplored threads
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Thread, ThreadStatus } from "../types.js";

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove fragment
    parsed.hash = "";
    // Remove trailing slash from path
    if (parsed.pathname.endsWith("/") && parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // Lowercase host
    return parsed.toString().toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export class ThreadPool {
  private threads: Thread[] = [];
  private filePath: string;
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "threads.json");
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await readFile(this.filePath, "utf-8");
      this.threads = JSON.parse(content);
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.threads = [];
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
    await writeFile(this.filePath, JSON.stringify(this.threads, null, 2));
  }

  async add(
    url: string,
    context: string,
    sessionId: string,
    depth: number,
    score: number
  ): Promise<Thread> {
    await this.load();

    const normalizedUrl = normalizeUrl(url);

    // Check for duplicate URL
    const existing = this.threads.find(
      (t) => normalizeUrl(t.url) === normalizedUrl && t.status === "pending"
    );
    if (existing) {
      // Update score if new one is higher
      if (score > existing.interestingness_score) {
        existing.interestingness_score = score;
        existing.context = context;
        await this.save();
      }
      return existing;
    }

    const thread: Thread = {
      id: randomUUID(),
      url: url.trim(),
      context,
      source_session_id: sessionId,
      source_depth: depth,
      interestingness_score: score,
      created_at: new Date().toISOString(),
      status: "pending" as ThreadStatus,
    };

    this.threads.push(thread);
    await this.save();
    return thread;
  }

  async getNext(): Promise<Thread | null> {
    await this.load();

    const pending = this.threads.filter((t) => t.status === "pending");
    if (pending.length === 0) {
      return null;
    }

    // Sort by score DESC
    pending.sort((a, b) => b.interestingness_score - a.interestingness_score);
    return pending[0];
  }

  async getById(id: string): Promise<Thread | null> {
    await this.load();
    return this.threads.find((t) => t.id === id) ?? null;
  }

  async update(id: string, updates: Partial<Thread>): Promise<Thread | null> {
    await this.load();

    const index = this.threads.findIndex((t) => t.id === id);
    if (index === -1) {
      return null;
    }

    // Only strip id from updates, allow other fields including created_at
    const { id: _id, ...safeUpdates } = updates;
    this.threads[index] = { ...this.threads[index], ...safeUpdates };
    await this.save();
    return this.threads[index];
  }

  async markExplored(id: string): Promise<void> {
    await this.update(id, { status: "explored" as ThreadStatus });
  }

  async markExploring(id: string): Promise<void> {
    await this.update(id, { status: "exploring" as ThreadStatus });
  }

  async prune(): Promise<number> {
    await this.load();

    const initialLength = this.threads.length;
    this.threads = this.threads.filter(
      (t) => t.status !== "explored" && t.status !== "decayed"
    );

    const removed = initialLength - this.threads.length;
    if (removed > 0) {
      await this.save();
    }
    return removed;
  }

  async count(status?: ThreadStatus): Promise<number> {
    await this.load();

    if (status) {
      return this.threads.filter((t) => t.status === status).length;
    }
    return this.threads.length;
  }

  async list(status?: ThreadStatus): Promise<Thread[]> {
    await this.load();

    if (status) {
      return this.threads.filter((t) => t.status === status);
    }
    return [...this.threads];
  }
}
