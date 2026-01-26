import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { ThreadPool } from "../../src/threads/thread_pool.js";
import { decayOldThreads } from "../../src/threads/thread_decay.js";

const TEST_DIR = join(process.cwd(), ".test-data-threads");

describe("ThreadPool", () => {
  let pool: ThreadPool;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    pool = new ThreadPool(TEST_DIR);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("add", () => {
    it("creates thread with correct fields", async () => {
      const thread = await pool.add(
        "https://example.com/page",
        "from test",
        "session-123",
        1,
        0.7
      );

      expect(thread.id).toBeDefined();
      expect(thread.url).toBe("https://example.com/page");
      expect(thread.context).toBe("from test");
      expect(thread.source_session_id).toBe("session-123");
      expect(thread.source_depth).toBe(1);
      expect(thread.interestingness_score).toBe(0.7);
      expect(thread.status).toBe("pending");
    });

    it("deduplicates by URL", async () => {
      await pool.add("https://example.com/page", "first", "s1", 1, 0.5);
      const second = await pool.add("https://example.com/page", "second", "s2", 2, 0.8);

      const count = await pool.count();
      expect(count).toBe(1);
      expect(second.interestingness_score).toBe(0.8); // Updated to higher score
    });

    it("normalizes URLs for deduplication", async () => {
      await pool.add("https://example.com/page/", "first", "s1", 1, 0.5);
      await pool.add("https://example.com/page", "second", "s2", 2, 0.8);

      const count = await pool.count();
      expect(count).toBe(1);
    });
  });

  describe("getNext", () => {
    it("returns highest scored pending thread", async () => {
      await pool.add("https://low.com", "low", "s1", 1, 0.3);
      await pool.add("https://high.com", "high", "s1", 1, 0.9);
      await pool.add("https://mid.com", "mid", "s1", 1, 0.6);

      const next = await pool.getNext();
      expect(next?.url).toBe("https://high.com");
    });

    it("returns null when pool is empty", async () => {
      const next = await pool.getNext();
      expect(next).toBeNull();
    });

    it("skips explored threads", async () => {
      const t1 = await pool.add("https://explored.com", "x", "s1", 1, 0.9);
      await pool.add("https://pending.com", "x", "s1", 1, 0.5);
      await pool.markExplored(t1.id);

      const next = await pool.getNext();
      expect(next?.url).toBe("https://pending.com");
    });
  });

  describe("prune", () => {
    it("removes explored and decayed threads", async () => {
      const t1 = await pool.add("https://a.com", "x", "s1", 1, 0.5);
      const t2 = await pool.add("https://b.com", "x", "s1", 1, 0.5);
      await pool.add("https://c.com", "x", "s1", 1, 0.5);

      await pool.markExplored(t1.id);
      await pool.update(t2.id, { status: "decayed" as any });

      const removed = await pool.prune();
      expect(removed).toBe(2);

      const remaining = await pool.count();
      expect(remaining).toBe(1);
    });
  });
});

describe("decayOldThreads", () => {
  let pool: ThreadPool;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    pool = new ThreadPool(TEST_DIR);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("decays threads older than threshold", async () => {
    // Add thread and manually backdate it
    const thread = await pool.add("https://old.com", "x", "s1", 1, 0.5);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    await pool.update(thread.id, { created_at: oldDate.toISOString() });

    await pool.add("https://new.com", "x", "s1", 1, 0.5);

    const decayed = await decayOldThreads(pool, 14);
    expect(decayed).toBe(1);

    const pending = await pool.count("pending" as any);
    expect(pending).toBe(1);
  });
});
