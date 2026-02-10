import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Scheduler } from "../../src/scheduler/scheduler.js";
import { mkdir, rm } from "node:fs/promises";

const TEST_DIR = ".test-data-scheduler";

describe("Scheduler", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("shouldExplore", () => {
    it("returns true when never explored before", async () => {
      const scheduler = new Scheduler(TEST_DIR);
      const should = await scheduler.shouldExplore();
      expect(should).toBe(true);
    });

    it("returns false immediately after exploring", async () => {
      const scheduler = new Scheduler(TEST_DIR, {
        explore_interval_ms: 60000, // 1 minute
      });
      await scheduler.recordExplore();

      const should = await scheduler.shouldExplore();
      expect(should).toBe(false);
    });

    it("returns true after interval has passed", async () => {
      const scheduler = new Scheduler(TEST_DIR, {
        explore_interval_ms: 100, // 100ms for testing
      });
      await scheduler.recordExplore();

      // Wait for interval to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      const should = await scheduler.shouldExplore();
      expect(should).toBe(true);
    });
  });

  describe("shouldDigest", () => {
    it("returns true when never sent digest before", async () => {
      const scheduler = new Scheduler(TEST_DIR);
      const should = await scheduler.shouldDigest();
      expect(should).toBe(true);
    });

    it("returns false immediately after sending digest", async () => {
      const scheduler = new Scheduler(TEST_DIR, {
        digest_interval_ms: 60000, // 1 minute
      });
      await scheduler.recordDigest();

      const should = await scheduler.shouldDigest();
      expect(should).toBe(false);
    });

    it("returns true after interval has passed", async () => {
      const scheduler = new Scheduler(TEST_DIR, {
        digest_interval_ms: 100, // 100ms for testing
      });
      await scheduler.recordDigest();

      // Wait for interval to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      const should = await scheduler.shouldDigest();
      expect(should).toBe(true);
    });
  });

  describe("recordExplore", () => {
    it("updates last explore time", async () => {
      const scheduler = new Scheduler(TEST_DIR);
      expect(await scheduler.getLastExploreTime()).toBeNull();

      await scheduler.recordExplore();

      const lastTime = await scheduler.getLastExploreTime();
      expect(lastTime).not.toBeNull();
      expect(lastTime!.getTime()).toBeLessThanOrEqual(Date.now());
      expect(lastTime!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe("recordDigest", () => {
    it("updates last digest time", async () => {
      const scheduler = new Scheduler(TEST_DIR);
      expect(await scheduler.getLastDigestTime()).toBeNull();

      await scheduler.recordDigest();

      const lastTime = await scheduler.getLastDigestTime();
      expect(lastTime).not.toBeNull();
      expect(lastTime!.getTime()).toBeLessThanOrEqual(Date.now());
      expect(lastTime!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe("persistence", () => {
    it("persists state between instances", async () => {
      // First instance records exploration
      const scheduler1 = new Scheduler(TEST_DIR);
      await scheduler1.recordExplore();
      const time1 = await scheduler1.getLastExploreTime();

      // Second instance should see the same time
      const scheduler2 = new Scheduler(TEST_DIR);
      const time2 = await scheduler2.getLastExploreTime();

      expect(time2).not.toBeNull();
      expect(time2!.getTime()).toBe(time1!.getTime());
    });
  });
});
