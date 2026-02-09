/**
 * Tests for Code Adapter
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CodeAdapter } from "../../src/sources/code_adapter.js";

const TEST_DIR = join(tmpdir(), "curiosity-engine-code-test-" + Date.now());

describe("CodeAdapter", () => {
  let adapter: CodeAdapter;

  beforeAll(async () => {
    adapter = new CodeAdapter({
      languages: ["python", "typescript", "javascript"],
      include_tests: false,
      max_file_size_mb: 1,
    });

    // Create test directory and files
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, "src"), { recursive: true });
    await mkdir(join(TEST_DIR, "tests"), { recursive: true });

    // Python file
    await writeFile(
      join(TEST_DIR, "src", "main.py"),
      `"""Main module for the application."""

import os
from typing import List
from utils import helper

class UserService:
    """Service for handling users."""
    
    def get_user(self, user_id: int) -> dict:
        """Get a user by ID."""
        # TODO: Add caching here
        return {"id": user_id}
    
    async def create_user(self, name: str) -> dict:
        # FIXME: Validate input
        return {"name": name}

def main():
    """Entry point."""
    service = UserService()
    return service.get_user(1)
`
    );

    // TypeScript file
    await writeFile(
      join(TEST_DIR, "src", "service.ts"),
      `import { User } from './types';
import { db } from '@/lib/database';

export class UserRepository {
  async findById(id: number): Promise<User> {
    // TODO: Add error handling
    return db.users.find(id);
  }
}

export const getUser = async (id: number) => {
  const repo = new UserRepository();
  return repo.findById(id);
};

// NOTE: This should be refactored
const helper = (x: number) => x * 2;
`
    );

    // JavaScript file
    await writeFile(
      join(TEST_DIR, "src", "utils.js"),
      `const lodash = require('lodash');
import axios from 'axios';

function formatDate(date) {
  // Simple date formatter
  return date.toISOString();
}

class Logger {
  log(message) {
    console.log(message);
  }
}

// TODO: Add more utilities
module.exports = { formatDate, Logger };
`
    );

    // Test file (should be skipped)
    await writeFile(
      join(TEST_DIR, "tests", "main.test.py"),
      `import pytest

def test_main():
    assert True
`
    );
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("canHandle", () => {
    it("should handle code: prefix", () => {
      expect(adapter.canHandle("code:/path/to/project")).toBe(true);
      expect(adapter.canHandle("code:~/projects")).toBe(true);
    });

    it("should not handle other prefixes", () => {
      expect(adapter.canHandle("https://example.com")).toBe(false);
      expect(adapter.canHandle("local:/path")).toBe(false);
      expect(adapter.canHandle("/path/to/file")).toBe(false);
    });
  });

  describe("fetch single file", () => {
    it("should extract Python functions and classes", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}/src/main.py`);

      expect(content.title).toContain("main.py");
      expect(content.text).toContain("UserService");
      expect(content.text).toContain("main"); // Top-level function
      expect(content.source_type).toBe("code");
    });

    it("should extract TODOs and FIXMEs", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}/src/main.py`);

      expect(content.text).toContain("TODO");
      expect(content.text).toContain("Add caching");
      expect(content.text).toContain("FIXME");
    });

    it("should extract TypeScript classes and functions", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}/src/service.ts`);

      expect(content.text).toContain("UserRepository");
      expect(content.text).toContain("getUser"); // Arrow function
      expect(content.text).toContain("helper"); // Arrow function
    });

    it("should extract JavaScript with CommonJS", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}/src/utils.js`);

      expect(content.text).toContain("formatDate");
      expect(content.text).toContain("Logger");
    });
  });

  describe("fetch directory", () => {
    it("should aggregate content from all source files", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}`);

      expect(content.title).toContain("3 files");
      expect(content.text).toContain("UserService");
      expect(content.text).toContain("UserRepository");
      expect(content.text).toContain("Logger");
    });

    it("should skip test files when include_tests is false", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}`);

      expect(content.text).not.toContain("test_main");
    });

    it("should include language breakdown", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}`);

      expect(content.text).toContain("python:");
      expect(content.text).toContain("typescript:");
      expect(content.text).toContain("javascript:");
    });
  });

  describe("extractLinks", () => {
    it("should extract code: links from imports", async () => {
      const content = await adapter.fetch(`code:${TEST_DIR}/src/service.ts`);
      const links = adapter.extractLinks(content);

      // Should have links for non-relative imports
      expect(links.some(l => l.includes("code:"))).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should reject nonexistent paths", async () => {
      await expect(
        adapter.fetch(`code:${TEST_DIR}/nonexistent.py`)
      ).rejects.toThrow("not found");
    });

    it("should reject unsupported languages", async () => {
      await writeFile(join(TEST_DIR, "file.rb"), "puts 'hello'");

      await expect(
        adapter.fetch(`code:${TEST_DIR}/file.rb`)
      ).rejects.toThrow("Unsupported");
    });
  });
});
