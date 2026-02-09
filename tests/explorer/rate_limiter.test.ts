import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter, createConcurrencyLimiter } from "../../src/explorer/rate_limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(100); // 100ms delay
  });

  it("creates a rate limiter", () => {
    expect(limiter).toBeDefined();
  });

  it("allows first request immediately", () => {
    expect(limiter.canProceed("https://example.com/page1")).toBe(true);
    expect(limiter.getWaitTime("https://example.com/page1")).toBe(0);
  });

  it("blocks subsequent requests to same domain", async () => {
    await limiter.acquire("https://example.com/page1");
    expect(limiter.canProceed("https://example.com/page2")).toBe(false);
    expect(limiter.getWaitTime("https://example.com/page2")).toBeGreaterThan(0);
  });

  it("allows requests to different domains", async () => {
    await limiter.acquire("https://example.com/page1");
    expect(limiter.canProceed("https://other.com/page1")).toBe(true);
  });

  it("clears rate limit for a domain", async () => {
    await limiter.acquire("https://example.com/page1");
    limiter.clear("https://example.com/anything");
    expect(limiter.canProceed("https://example.com/page2")).toBe(true);
  });

  it("clears all rate limits", async () => {
    await limiter.acquire("https://example.com/page1");
    await limiter.acquire("https://other.com/page1");
    limiter.clearAll();
    expect(limiter.canProceed("https://example.com/page2")).toBe(true);
    expect(limiter.canProceed("https://other.com/page2")).toBe(true);
  });
});

describe("createConcurrencyLimiter", () => {
  it("limits concurrent operations", async () => {
    const limit = createConcurrencyLimiter(2);
    let concurrent = 0;
    let maxConcurrent = 0;

    const task = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 50));
      concurrent--;
    };

    // Start 5 tasks with concurrency limit of 2
    await Promise.all([
      limit(task),
      limit(task),
      limit(task),
      limit(task),
      limit(task),
    ]);

    expect(maxConcurrent).toBe(2);
  });

  it("returns task results", async () => {
    const limit = createConcurrencyLimiter(2);

    const result = await limit(async () => {
      return 42;
    });

    expect(result).toBe(42);
  });

  it("propagates errors", async () => {
    const limit = createConcurrencyLimiter(2);

    await expect(
      limit(async () => {
        throw new Error("test error");
      })
    ).rejects.toThrow("test error");
  });
});
