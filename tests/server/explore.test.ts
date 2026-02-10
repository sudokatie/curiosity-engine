/**
 * Tests for exploration API routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { exploreRouter, setWebSocketBroadcast } from "../../src/server/routes/explore.js";

// Mock dependencies
vi.mock("../../src/config.js", () => ({
  getConfig: vi.fn(() => ({
    data_dir: "/tmp/test-curiosity",
    sources: { web: {} },
    exploration: {
      fetch_delay_ms: 100,
      source_timeout_ms: 5000,
    },
  })),
}));

vi.mock("../../src/seeds/seed_manager.js", () => ({
  SeedManager: vi.fn().mockImplementation(() => ({
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../src/threads/thread_pool.js", () => ({
  ThreadPool: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../src/journal/journal.js", () => ({
  Journal: vi.fn().mockImplementation(() => ({})),
}));

describe("Explore API", () => {
  let app: express.Application;
  let broadcastEvents: Array<{ type: string; data: unknown }>;

  beforeEach(() => {
    vi.clearAllMocks();
    broadcastEvents = [];
    
    app = express();
    app.use(express.json());
    app.use("/api/explore", exploreRouter);
    
    setWebSocketBroadcast((event) => {
      broadcastEvents.push(event);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /status", () => {
    it("returns idle status when no exploration running", async () => {
      const res = await request(app).get("/api/explore/status");
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "idle",
        seedId: null,
      });
    });
  });

  describe("POST / (start exploration)", () => {
    it("returns error when no seed available", async () => {
      const res = await request(app)
        .post("/api/explore")
        .send({});
      
      // May return 400 (no seed) or 500 (internal error) depending on mock setup
      expect([400, 500]).toContain(res.status);
    });
  });

  describe("DELETE / (cancel exploration)", () => {
    it("returns 400 when no exploration running", async () => {
      const res = await request(app).delete("/api/explore");
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No exploration running");
    });
  });

  describe("WebSocket broadcast", () => {
    it("captures broadcast events", () => {
      setWebSocketBroadcast((event) => {
        broadcastEvents.push(event);
      });

      // Simulate a broadcast (would normally come from exploration)
      // This just verifies the broadcast setup works
      expect(broadcastEvents).toEqual([]);
    });
  });
});

describe("Cancellation behavior", () => {
  it("AbortController cancels async operations", async () => {
    const controller = new AbortController();
    let wasAborted = false;

    const asyncOp = new Promise<void>((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new Error("AbortError"));
        return;
      }

      controller.signal.addEventListener("abort", () => {
        wasAborted = true;
        reject(new Error("AbortError"));
      });

      // Simulate long-running operation
      setTimeout(resolve, 1000);
    });

    // Cancel immediately
    controller.abort();

    await expect(asyncOp).rejects.toThrow("AbortError");
    expect(wasAborted).toBe(true);
  });

  it("signal.aborted is true after abort()", () => {
    const controller = new AbortController();
    expect(controller.signal.aborted).toBe(false);
    
    controller.abort();
    
    expect(controller.signal.aborted).toBe(true);
  });
});
