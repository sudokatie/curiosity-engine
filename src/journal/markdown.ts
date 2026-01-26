/**
 * Markdown Formatter - Format discoveries as markdown
 */

import type { Discovery } from "../types.js";
import { getDiscoverySummary } from "./discovery.js";

/**
 * Format a single discovery as full markdown
 */
export function discoveryToMarkdown(discovery: Discovery): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${discovery.title}`);
  lines.push("");

  // Metadata
  const date = new Date(discovery.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  lines.push(`**Date**: ${date}`);
  lines.push(`**Significance**: ${(discovery.significance * 100).toFixed(0)}%`);
  lines.push(`**Session**: ${discovery.session_id}`);
  lines.push("");

  // Path
  if (discovery.seed_path.length > 0) {
    lines.push("## Path");
    lines.push("");
    lines.push(discovery.seed_path.join(" -> "));
    lines.push("");
  }

  // Content
  lines.push("## Discovery");
  lines.push("");
  lines.push(discovery.content);
  lines.push("");

  // Connections
  if (discovery.connections.length > 0) {
    lines.push("## Connections");
    lines.push("");
    for (const connection of discovery.connections) {
      lines.push(`- ${connection}`);
    }
    lines.push("");
  }

  // Questions
  if (discovery.questions.length > 0) {
    lines.push("## Questions Opened");
    lines.push("");
    for (const question of discovery.questions) {
      lines.push(`- ${question}`);
    }
    lines.push("");
  }

  // Tags
  if (discovery.tags.length > 0) {
    lines.push("## Tags");
    lines.push("");
    lines.push(discovery.tags.map((t) => `\`${t}\``).join(" "));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a discovery as a short summary entry
 */
export function discoveryToSummary(
  discovery: Discovery,
  index?: number
): string {
  const lines: string[] = [];

  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const significance = (discovery.significance * 100).toFixed(0);

  lines.push(`### ${prefix}${discovery.title} (${significance}%)`);
  lines.push("");
  lines.push(getDiscoverySummary(discovery));
  lines.push("");

  if (discovery.questions.length > 0) {
    lines.push(`*Opens*: ${discovery.questions.slice(0, 2).join("; ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format multiple discoveries as a list
 */
export function discoveryListToMarkdown(
  discoveries: Discovery[],
  options?: { title?: string; showStats?: boolean }
): string {
  const lines: string[] = [];
  const title = options?.title ?? "Discoveries";
  const showStats = options?.showStats ?? true;

  lines.push(`# ${title}`);
  lines.push("");

  if (showStats && discoveries.length > 0) {
    const avgSignificance =
      discoveries.reduce((sum, d) => sum + d.significance, 0) /
      discoveries.length;
    lines.push(`**Total**: ${discoveries.length}`);
    lines.push(
      `**Average Significance**: ${(avgSignificance * 100).toFixed(0)}%`
    );
    lines.push("");
  }

  if (discoveries.length === 0) {
    lines.push("No discoveries in this period.");
    lines.push("");
  } else {
    for (let i = 0; i < discoveries.length; i++) {
      lines.push(discoveryToSummary(discoveries[i], i));
    }
  }

  return lines.join("\n");
}
