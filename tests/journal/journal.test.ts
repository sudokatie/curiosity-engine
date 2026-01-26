import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Journal } from "../../src/journal/journal.js";
import { createDiscovery } from "../../src/journal/discovery.js";

const TEST_DIR = join(process.cwd(), ".test-data-journal");

describe("Journal", () => {
  let journal: Journal;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    journal = new Journal(TEST_DIR);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("add", () => {
    it("adds discovery to index", async () => {
      const discovery = createDiscovery({
        sessionId: "session-1",
        seedPath: ["start", "middle", "end"],
        title: "Test Discovery",
        content: "This is a test discovery content.",
        significance: 0.75,
      });

      await journal.add(discovery);

      const retrieved = await journal.getById(discovery.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe("Test Discovery");
    });

    it("creates markdown file", async () => {
      const discovery = createDiscovery({
        sessionId: "session-1",
        seedPath: ["start"],
        title: "MD Test",
        content: "Content here.",
        significance: 0.5,
      });

      await journal.add(discovery);

      // Verify by loading fresh journal
      const journal2 = new Journal(TEST_DIR);
      const found = await journal2.getById(discovery.id);
      expect(found).toBeDefined();
    });
  });

  describe("list", () => {
    it("returns discoveries sorted by date", async () => {
      const d1 = createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "First",
        content: "Content",
        significance: 0.5,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      const d2 = createDiscovery({
        sessionId: "s2",
        seedPath: [],
        title: "Second",
        content: "Content",
        significance: 0.5,
      });

      await journal.add(d1);
      await journal.add(d2);

      const list = await journal.list();
      expect(list[0].title).toBe("Second"); // Most recent first
    });

    it("filters by significance", async () => {
      const low = createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "Low",
        content: "Content",
        significance: 0.3,
      });

      const high = createDiscovery({
        sessionId: "s2",
        seedPath: [],
        title: "High",
        content: "Content",
        significance: 0.9,
      });

      await journal.add(low);
      await journal.add(high);

      const filtered = await journal.list({ minSignificance: 0.5 });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("High");
    });

    it("respects limit", async () => {
      for (let i = 0; i < 5; i++) {
        await journal.add(
          createDiscovery({
            sessionId: `s${i}`,
            seedPath: [],
            title: `Discovery ${i}`,
            content: "Content",
            significance: 0.5,
          })
        );
      }

      const limited = await journal.list({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  describe("search", () => {
    it("finds discoveries by title", async () => {
      await journal.add(
        createDiscovery({
          sessionId: "s1",
          seedPath: [],
          title: "Quantum Computing Basics",
          content: "Introduction to qubits",
          significance: 0.7,
        })
      );

      await journal.add(
        createDiscovery({
          sessionId: "s2",
          seedPath: [],
          title: "Classical Physics",
          content: "Newton's laws",
          significance: 0.6,
        })
      );

      const results = await journal.search("quantum");
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("Quantum");
    });

    it("finds discoveries by content", async () => {
      await journal.add(
        createDiscovery({
          sessionId: "s1",
          seedPath: [],
          title: "Generic Title",
          content: "This discusses machine learning algorithms",
          significance: 0.7,
        })
      );

      const results = await journal.search("machine learning");
      expect(results).toHaveLength(1);
    });

    it("is case insensitive", async () => {
      await journal.add(
        createDiscovery({
          sessionId: "s1",
          seedPath: [],
          title: "UPPERCASE TITLE",
          content: "content",
          significance: 0.5,
        })
      );

      const results = await journal.search("uppercase");
      expect(results).toHaveLength(1);
    });
  });
});

describe("createDiscovery", () => {
  it("generates unique IDs", () => {
    const d1 = createDiscovery({
      sessionId: "s1",
      seedPath: [],
      title: "Test",
      content: "Content",
      significance: 0.5,
    });

    const d2 = createDiscovery({
      sessionId: "s1",
      seedPath: [],
      title: "Test",
      content: "Content",
      significance: 0.5,
    });

    expect(d1.id).not.toBe(d2.id);
  });

  it("throws on empty title", () => {
    expect(() =>
      createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "",
        content: "Content",
        significance: 0.5,
      })
    ).toThrow();
  });

  it("throws on invalid significance", () => {
    expect(() =>
      createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "Test",
        content: "Content",
        significance: 1.5,
      })
    ).toThrow();
  });
});
