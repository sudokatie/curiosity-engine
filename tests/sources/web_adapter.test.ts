import { describe, it, expect, vi } from "vitest";
import { WebAdapter } from "../../src/sources/web_adapter.js";
import { SourceFetchError } from "../../src/sources/adapter.js";

describe("WebAdapter", () => {
  describe("canHandle", () => {
    const adapter = new WebAdapter();

    it("returns true for http URLs", () => {
      expect(adapter.canHandle("http://example.com")).toBe(true);
    });

    it("returns true for https URLs", () => {
      expect(adapter.canHandle("https://example.com")).toBe(true);
    });

    it("returns false for non-URLs", () => {
      expect(adapter.canHandle("not a url")).toBe(false);
      expect(adapter.canHandle("ftp://example.com")).toBe(false);
      expect(adapter.canHandle("/local/path")).toBe(false);
    });
  });

  describe("extractLinks", () => {
    const adapter = new WebAdapter({
      blocked_domains: ["blocked.com"],
    });

    it("filters out blocked domains", () => {
      const content = {
        url: "https://example.com",
        title: "Test",
        text: "Content",
        links: [
          "https://allowed.com/page",
          "https://blocked.com/page",
          "https://another.com/page",
        ],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const links = adapter.extractLinks(content);

      expect(links).toContain("https://allowed.com/page");
      expect(links).toContain("https://another.com/page");
      expect(links).not.toContain("https://blocked.com/page");
    });

    it("filters out invalid URLs", () => {
      const content = {
        url: "https://example.com",
        title: "Test",
        text: "Content",
        links: ["https://valid.com", "not-a-url", "javascript:void(0)"],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const links = adapter.extractLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0]).toBe("https://valid.com");
    });
  });

  describe("fetch", () => {
    it("throws SourceFetchError for blocked domain", async () => {
      const adapter = new WebAdapter({
        blocked_domains: ["blocked.com"],
      });

      await expect(adapter.fetch("https://blocked.com/page")).rejects.toThrow(
        SourceFetchError
      );
    });

    it("throws SourceFetchError for invalid URL", async () => {
      const adapter = new WebAdapter();

      await expect(adapter.fetch("not-a-url")).rejects.toThrow(SourceFetchError);
    });

    // Note: Real fetch tests would require mocking or a test server
    // These are kept minimal for the MVP
  });
});

describe("SourceFetchError", () => {
  it("includes URL in error", () => {
    const error = new SourceFetchError("https://example.com", 404);

    expect(error.url).toBe("https://example.com");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("SourceFetchError");
  });

  it("uses custom message when provided", () => {
    const error = new SourceFetchError(
      "https://example.com",
      undefined,
      "Custom message"
    );

    expect(error.message).toBe("Custom message");
  });
});
