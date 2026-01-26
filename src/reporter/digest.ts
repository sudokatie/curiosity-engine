/**
 * Digest Generator - Generate daily digest of discoveries
 */

import type { Journal } from "../journal/journal.js";
import type { Discovery } from "../types.js";
import { getDiscoverySummary } from "../journal/discovery.js";

/**
 * Deduplicate discoveries by title, keeping the highest significance version
 */
function deduplicateByTitle(discoveries: Discovery[]): Discovery[] {
  const seen = new Map<string, Discovery>();
  
  for (const d of discoveries) {
    const key = d.title.toLowerCase().trim();
    const existing = seen.get(key);
    
    if (!existing || d.significance > existing.significance) {
      seen.set(key, d);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Generate a digest of discoveries
 */
export async function generateDigest(
  journal: Journal,
  since?: Date
): Promise<string> {
  // Default to last 7 days
  const sinceDate = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const discoveries = await journal.list({ since: sinceDate });

  if (discoveries.length === 0) {
    return formatEmptyDigest(sinceDate);
  }

  // Deduplicate by title before processing
  const unique = deduplicateByTitle(discoveries);

  // Sort by significance
  const sorted = [...unique].sort(
    (a, b) => b.significance - a.significance
  );
  const top = sorted.slice(0, 10);

  return formatDigest(top, sinceDate, unique.length);
}

/**
 * Format empty digest
 */
function formatEmptyDigest(since: Date): string {
  const sinceStr = since.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `# Curiosity Engine Digest

**Period**: ${sinceStr} to now

No discoveries in this period.

Keep exploring!
`;
}

/**
 * Format digest with discoveries
 */
function formatDigest(
  topDiscoveries: Discovery[],
  since: Date,
  totalCount: number
): string {
  const sinceStr = since.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const nowStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const avgSignificance =
    topDiscoveries.reduce((sum, d) => sum + d.significance, 0) /
    topDiscoveries.length;

  const lines: string[] = [];

  lines.push("# Curiosity Engine Digest");
  lines.push("");
  lines.push(`**Period**: ${sinceStr} to ${nowStr}`);
  lines.push(`**Discoveries**: ${totalCount}`);
  lines.push(
    `**Average Significance**: ${(avgSignificance * 100).toFixed(0)}%`
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Top Discoveries");
  lines.push("");

  for (let i = 0; i < topDiscoveries.length; i++) {
    const d = topDiscoveries[i];
    lines.push(
      `### ${i + 1}. ${d.title} (${(d.significance * 100).toFixed(0)}%)`
    );
    lines.push("");
    lines.push(getDiscoverySummary(d, 200));
    lines.push("");

    if (d.questions.length > 0) {
      lines.push(`*Opens*: ${d.questions.slice(0, 2).join("; ")}`);
      lines.push("");
    }
  }

  // Aggregate questions
  const allQuestions = topDiscoveries.flatMap((d) => d.questions);
  const uniqueQuestions = [...new Set(allQuestions)].slice(0, 10);

  if (uniqueQuestions.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Questions Opened");
    lines.push("");
    for (const q of uniqueQuestions) {
      lines.push(`- ${q}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
