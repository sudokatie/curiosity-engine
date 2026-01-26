import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { SeedManager } from "../../src/seeds/seed_manager.js";
import { SeedSource, SeedStatus } from "../../src/types.js";

const TEST_DIR = join(process.cwd(), ".test-data-seeds");

describe("SeedManager", () => {
  let manager: SeedManager;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    manager = new SeedManager(TEST_DIR);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("add", () => {
    it("creates a seed with correct defaults", async () => {
      const seed = await manager.add("test content", SeedSource.USER_INPUT);

      expect(seed.id).toBeDefined();
      expect(seed.content).toBe("test content");
      expect(seed.source).toBe(SeedSource.USER_INPUT);
      expect(seed.status).toBe("active");
      expect(seed.priority).toBe(0.5);
      expect(seed.times_explored).toBe(0);
    });

    it("trims whitespace from content", async () => {
      const seed = await manager.add("  trimmed  ", SeedSource.USER_INPUT);
      expect(seed.content).toBe("trimmed");
    });

    it("throws on empty content", async () => {
      await expect(manager.add("", SeedSource.USER_INPUT)).rejects.toThrow();
      await expect(manager.add("   ", SeedSource.USER_INPUT)).rejects.toThrow();
    });

    it("stores source context", async () => {
      const seed = await manager.add("test", SeedSource.CONVERSATION, "from chat");
      expect(seed.source_context).toBe("from chat");
    });
  });

  describe("list", () => {
    it("returns all seeds", async () => {
      await manager.add("seed 1", SeedSource.USER_INPUT);
      await manager.add("seed 2", SeedSource.USER_INPUT);

      const list = await manager.list();
      expect(list).toHaveLength(2);
    });

    it("filters by status", async () => {
      const seed1 = await manager.add("seed 1", SeedSource.USER_INPUT);
      await manager.add("seed 2", SeedSource.USER_INPUT);
      await manager.update(seed1.id, { status: SeedStatus.DEFERRED });

      const active = await manager.list(SeedStatus.ACTIVE);
      const deferred = await manager.list(SeedStatus.DEFERRED);

      expect(active).toHaveLength(1);
      expect(deferred).toHaveLength(1);
    });

    it("returns empty array when no seeds", async () => {
      const list = await manager.list();
      expect(list).toHaveLength(0);
    });
  });

  describe("selectNext", () => {
    it("returns highest priority seed", async () => {
      await manager.add("low priority", SeedSource.USER_INPUT);
      const high = await manager.add("high priority", SeedSource.USER_INPUT);
      await manager.update(high.id, { priority: 0.9 });

      const next = await manager.selectNext();
      expect(next?.content).toBe("high priority");
    });

    it("prefers less explored seeds at same priority", async () => {
      const explored = await manager.add("explored", SeedSource.USER_INPUT);
      await manager.add("fresh", SeedSource.USER_INPUT);
      await manager.markExplored(explored.id);

      const next = await manager.selectNext();
      expect(next?.content).toBe("fresh");
    });

    it("returns null when no active seeds", async () => {
      const seed = await manager.add("test", SeedSource.USER_INPUT);
      await manager.update(seed.id, { status: SeedStatus.EXHAUSTED });

      const next = await manager.selectNext();
      expect(next).toBeNull();
    });
  });

  describe("update", () => {
    it("updates seed fields", async () => {
      const seed = await manager.add("test", SeedSource.USER_INPUT);
      const updated = await manager.update(seed.id, { priority: 0.8 });

      expect(updated?.priority).toBe(0.8);
    });

    it("returns null for non-existent seed", async () => {
      const result = await manager.update("fake-id", { priority: 0.8 });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("removes seed", async () => {
      const seed = await manager.add("test", SeedSource.USER_INPUT);
      const deleted = await manager.delete(seed.id);

      expect(deleted).toBe(true);
      expect(await manager.getById(seed.id)).toBeNull();
    });

    it("returns false for non-existent seed", async () => {
      const deleted = await manager.delete("fake-id");
      expect(deleted).toBe(false);
    });
  });

  describe("persistence", () => {
    it("persists seeds across instances", async () => {
      await manager.add("persistent", SeedSource.USER_INPUT);

      const manager2 = new SeedManager(TEST_DIR);
      const list = await manager2.list();

      expect(list).toHaveLength(1);
      expect(list[0].content).toBe("persistent");
    });
  });
});
