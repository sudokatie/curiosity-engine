import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Journal } from "../../src/journal/journal.js";
import { createDiscovery } from "../../src/journal/discovery.js";
import { generateDigest } from "../../src/reporter/digest.js";

const TEST_DIR = join(process.cwd(), ".test-data-digest");

describe("generateDigest", () => {
  let journal: Journal;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    journal = new Journal(TEST_DIR);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("generates empty digest message when no discoveries", async () => {
    const digest = await generateDigest(journal);

    expect(digest).toContain("No discoveries in this period");
  });

  it("includes discoveries in digest", async () => {
    await journal.add(
      createDiscovery({
        sessionId: "s1",
        seedPath: ["start"],
        title: "Important Finding",
        content: "This is an important discovery about something.",
        significance: 0.8,
      })
    );

    const digest = await generateDigest(journal);

    expect(digest).toContain("Important Finding");
    expect(digest).toContain("80%");
  });

  it("sorts discoveries by significance", async () => {
    await journal.add(
      createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "Low Priority",
        content: "Less important.",
        significance: 0.3,
      })
    );

    await journal.add(
      createDiscovery({
        sessionId: "s2",
        seedPath: [],
        title: "High Priority",
        content: "Very important.",
        significance: 0.9,
      })
    );

    const digest = await generateDigest(journal);

    const highIndex = digest.indexOf("High Priority");
    const lowIndex = digest.indexOf("Low Priority");

    expect(highIndex).toBeLessThan(lowIndex);
  });

  it("includes questions opened section", async () => {
    await journal.add(
      createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "Discovery with Questions",
        content: "Content here.",
        significance: 0.7,
        questions: ["What does this mean?", "How can we apply this?"],
      })
    );

    const digest = await generateDigest(journal);

    expect(digest).toContain("Questions Opened");
    expect(digest).toContain("What does this mean?");
  });

  it("respects since date filter", async () => {
    // Add old discovery
    const oldDiscovery = createDiscovery({
      sessionId: "s1",
      seedPath: [],
      title: "Old Discovery",
      content: "From the past.",
      significance: 0.8,
    });
    // Manually backdate
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    (oldDiscovery as any).created_at = oldDate.toISOString();
    await journal.add(oldDiscovery);

    // Add new discovery
    await journal.add(
      createDiscovery({
        sessionId: "s2",
        seedPath: [],
        title: "New Discovery",
        content: "From today.",
        significance: 0.7,
      })
    );

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const digest = await generateDigest(journal, recentDate);

    expect(digest).toContain("New Discovery");
    expect(digest).not.toContain("Old Discovery");
  });

  it("includes stats in header", async () => {
    await journal.add(
      createDiscovery({
        sessionId: "s1",
        seedPath: [],
        title: "Test",
        content: "Content.",
        significance: 0.6,
      })
    );

    const digest = await generateDigest(journal);

    expect(digest).toContain("Discoveries:");
    expect(digest).toContain("Average Significance:");
  });
});
