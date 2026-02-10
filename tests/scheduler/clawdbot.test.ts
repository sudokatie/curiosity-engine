/**
 * Tests for Clawdbot integration (heartbeat and cron)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

// Mock fs modules
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

// Import after mocking
import {
  registerHeartbeat,
  unregisterHeartbeat,
  registerCron,
  unregisterCron,
  sendMessage,
  sendDiscoveryAlert,
} from "../../src/scheduler/clawdbot.js";

describe("Heartbeat Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerHeartbeat", () => {
    it("creates heartbeat file if it does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await registerHeartbeat();

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("HEARTBEAT.md"),
        expect.stringContaining("Curiosity Engine Check")
      );
    });

    it("appends to existing heartbeat file", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue("# Existing tasks\n- Task 1");
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await registerHeartbeat();

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("HEARTBEAT.md"),
        expect.stringMatching(/Existing tasks[\s\S]*Curiosity Engine Check/)
      );
    });

    it("skips if task already registered", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue("## Curiosity Engine Check\nAlready here");
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await registerHeartbeat();

      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe("unregisterHeartbeat", () => {
    it("removes curiosity section from heartbeat file", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        "## Other Task\nContent\n\n## Curiosity Engine Check\nCuriosity content\n\n## Another Task\nMore content"
      );
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await unregisterHeartbeat();

      const written = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(written).toContain("Other Task");
      expect(written).toContain("Another Task");
      expect(written).not.toContain("Curiosity Engine Check");
    });

    it("does nothing if heartbeat file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await unregisterHeartbeat();

      expect(readFile).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});

describe("Cron Integration", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("registerCron", () => {
    it("creates new cron job if not exists", async () => {
      // First call: list jobs (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] }),
      });
      // Second call: add job
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "test-id-123" }),
      });

      const result = await registerCron("0 3 * * *");

      expect(result).toBe("test-id-123");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/cron?action=add"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("curiosity-deep-dive"),
        })
      );
    });

    it("returns existing job id if already registered", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [
            {
              id: "existing-id",
              name: "curiosity-deep-dive",
              enabled: true,
            },
          ],
        }),
      });

      const result = await registerCron();

      expect(result).toBe("existing-id");
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only list, no add
    });

    it("returns null on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await registerCron();

      expect(result).toBeNull();
    });
  });

  describe("unregisterCron", () => {
    it("removes existing cron job", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: "job-to-remove", name: "curiosity-deep-dive" }],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await unregisterCron();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("action=remove&id=job-to-remove"),
        { method: "DELETE" }
      );
    });

    it("returns true if job does not exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] }),
      });

      const result = await unregisterCron();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Messaging", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe("sendMessage", () => {
    it("sends message via gateway", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendMessage("Test message");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/message"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Test message"),
        })
      );
    });

    it("includes channel when specified", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendMessage("Test message", "telegram");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.target).toBe("telegram");
    });

    it("throws on gateway error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(sendMessage("Test")).rejects.toThrow("Gateway returned 500");
    });
  });

  describe("sendDiscoveryAlert", () => {
    it("formats discovery alert correctly", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendDiscoveryAlert("Test Discovery", 0.85, "https://example.com");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message).toContain("New Discovery");
      expect(body.message).toContain("Test Discovery");
      expect(body.message).toContain("85%");
      expect(body.message).toContain("https://example.com");
    });

    it("calculates stars based on significance", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendDiscoveryAlert("High Significance", 1.0);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message).toContain("⭐⭐⭐⭐⭐"); // 5 stars for 1.0
    });
  });
});
