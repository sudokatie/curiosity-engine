/**
 * Seed Manager - CRUD operations and selection for interest seeds
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Seed, SeedSource, SeedStatus } from "../types.js";

export class SeedManager {
  private seeds: Seed[] = [];
  private filePath: string;
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "seeds.json");
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await readFile(this.filePath, "utf-8");
      this.seeds = JSON.parse(content);
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.seeds = [];
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
    await writeFile(this.filePath, JSON.stringify(this.seeds, null, 2));
  }

  async add(
    content: string,
    source: SeedSource,
    context?: string
  ): Promise<Seed> {
    await this.load();

    if (!content.trim()) {
      throw new Error("Seed content cannot be empty");
    }

    const seed: Seed = {
      id: randomUUID(),
      content: content.trim(),
      source,
      source_context: context ?? null,
      created_at: new Date().toISOString(),
      priority: 0.5,
      times_explored: 0,
      last_explored_at: null,
      status: "active" as SeedStatus,
      tags: [],
    };

    this.seeds.push(seed);
    await this.save();
    return seed;
  }

  async update(id: string, updates: Partial<Seed>): Promise<Seed | null> {
    await this.load();

    const index = this.seeds.findIndex((s) => s.id === id);
    if (index === -1) {
      return null;
    }

    // Don't allow updating id or created_at
    const { id: _id, created_at: _created, ...safeUpdates } = updates;
    this.seeds[index] = { ...this.seeds[index], ...safeUpdates };
    await this.save();
    return this.seeds[index];
  }

  async delete(id: string): Promise<boolean> {
    await this.load();

    const initialLength = this.seeds.length;
    this.seeds = this.seeds.filter((s) => s.id !== id);

    if (this.seeds.length < initialLength) {
      await this.save();
      return true;
    }
    return false;
  }

  async getById(id: string): Promise<Seed | null> {
    await this.load();
    return this.seeds.find((s) => s.id === id) ?? null;
  }

  async list(status?: SeedStatus): Promise<Seed[]> {
    await this.load();

    if (status) {
      return this.seeds.filter((s) => s.status === status);
    }
    return [...this.seeds];
  }

  async selectNext(): Promise<Seed | null> {
    await this.load();

    const active = this.seeds.filter((s) => s.status === "active");
    if (active.length === 0) {
      return null;
    }

    // Sort by: priority DESC, times_explored ASC, created_at ASC
    active.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Less explored first
      if (a.times_explored !== b.times_explored) {
        return a.times_explored - b.times_explored;
      }
      // Older first
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return active[0];
  }

  async markExplored(id: string): Promise<Seed | null> {
    const seed = await this.getById(id);
    if (!seed) return null;

    return this.update(id, {
      times_explored: seed.times_explored + 1,
      last_explored_at: new Date().toISOString(),
    });
  }

  async count(status?: SeedStatus): Promise<number> {
    const seeds = await this.list(status);
    return seeds.length;
  }
}
