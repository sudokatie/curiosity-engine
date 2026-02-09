/**
 * Tests for Local Adapter
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalAdapter } from "../../src/sources/local_adapter.js";

const TEST_DIR = join(tmpdir(), "curiosity-engine-test-" + Date.now());

describe("LocalAdapter", () => {
  let adapter: LocalAdapter;

  beforeAll(async () => {
    adapter = new LocalAdapter({
      extensions: [".md", ".txt"],
      max_file_size_mb: 1,
    });

    // Create test directory and files
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, "subdir"), { recursive: true });

    // Create test files
    await writeFile(
      join(TEST_DIR, "notes.md"),
      `---
title: Test Notes
---
# My Notes

This is a test markdown file with a link: https://example.com

And a markdown link: [Example](https://example.org)

Also a wiki-style link: [[other-note]]
`
    );

    await writeFile(
      join(TEST_DIR, "plain.txt"),
      `This is plain text content.
Check out https://test.com for more info.
`
    );

    await writeFile(
      join(TEST_DIR, "subdir", "nested.md"),
      `# Nested File
Content in subdirectory with link https://nested.example.com
`
    );

    // Create an ignored file
    await writeFile(join(TEST_DIR, ".hidden.md"), "Hidden content");
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("canHandle", () => {
    it("should handle local: prefix", () => {
      expect(adapter.canHandle("local:/path/to/file")).toBe(true);
      expect(adapter.canHandle("local:~/Documents")).toBe(true);
    });

    it("should not handle other prefixes", () => {
      expect(adapter.canHandle("https://example.com")).toBe(false);
      expect(adapter.canHandle("/path/to/file")).toBe(false);
      expect(adapter.canHandle("file:///path")).toBe(false);
    });
  });

  describe("fetch single file", () => {
    it("should fetch markdown file with frontmatter", async () => {
      const content = await adapter.fetch(`local:${TEST_DIR}/notes.md`);

      expect(content.title).toBe("Test Notes");
      expect(content.text).toContain("My Notes");
      expect(content.source_type).toBe("local");
      expect(content.links).toContain("https://example.com");
      expect(content.links).toContain("https://example.org");
    });

    it("should fetch plain text file", async () => {
      const content = await adapter.fetch(`local:${TEST_DIR}/plain.txt`);

      expect(content.title).toBe("plain.txt");
      expect(content.text).toContain("plain text content");
      expect(content.links).toContain("https://test.com");
    });

    it("should reject unsupported file types", async () => {
      await writeFile(join(TEST_DIR, "binary.bin"), Buffer.from([0, 1, 2, 3]));

      await expect(
        adapter.fetch(`local:${TEST_DIR}/binary.bin`)
      ).rejects.toThrow("Unsupported file type");
    });

    it("should reject nonexistent files", async () => {
      await expect(
        adapter.fetch(`local:${TEST_DIR}/nonexistent.md`)
      ).rejects.toThrow("not found");
    });
  });

  describe("fetch directory", () => {
    it("should aggregate content from directory", async () => {
      const content = await adapter.fetch(`local:${TEST_DIR}`);

      expect(content.title).toContain("Directory:");
      expect(content.text).toContain("Test Notes");
      expect(content.text).toContain("plain text content");
      expect(content.text).toContain("Nested File");
      expect(content.links).toContain("https://example.com");
      expect(content.links).toContain("https://test.com");
    });

    it("should skip hidden files", async () => {
      const content = await adapter.fetch(`local:${TEST_DIR}`);

      expect(content.text).not.toContain("Hidden content");
    });
  });

  describe("extractLinks", () => {
    it("should extract web links", async () => {
      const content = await adapter.fetch(`local:${TEST_DIR}/notes.md`);
      const links = adapter.extractLinks(content);

      expect(links).toContain("https://example.com");
      expect(links).toContain("https://example.org");
    });

    it("should extract wiki-style links as local references", async () => {
      const content = await adapter.fetch(`local:${TEST_DIR}/notes.md`);
      const links = adapter.extractLinks(content);

      const localLinks = links.filter((l) => l.startsWith("local:"));
      expect(localLinks.length).toBeGreaterThan(0);
    });
  });

  describe("file size limit", () => {
    it("should reject files over the limit", async () => {
      // Create a file larger than 1MB
      const largeContent = "x".repeat(1.5 * 1024 * 1024);
      await writeFile(join(TEST_DIR, "large.txt"), largeContent);

      await expect(adapter.fetch(`local:${TEST_DIR}/large.txt`)).rejects.toThrow(
        "too large"
      );
    });
  });
});
