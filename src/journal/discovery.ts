/**
 * Discovery Model - Create and validate discoveries
 */

import { randomUUID } from "node:crypto";
import type { Discovery } from "../types.js";

export interface CreateDiscoveryParams {
  sessionId: string;
  seedPath: string[];
  title: string;
  content: string;
  significance: number;
  connections?: string[];
  questions?: string[];
  tags?: string[];
}

/**
 * Create a new discovery with defaults
 */
export function createDiscovery(params: CreateDiscoveryParams): Discovery {
  if (!params.title.trim()) {
    throw new Error("Discovery title cannot be empty");
  }
  if (!params.content.trim()) {
    throw new Error("Discovery content cannot be empty");
  }
  if (params.significance < 0 || params.significance > 1) {
    throw new Error("Significance must be between 0 and 1");
  }

  return {
    id: randomUUID(),
    session_id: params.sessionId,
    seed_path: params.seedPath,
    title: params.title.trim(),
    content: params.content.trim(),
    significance: params.significance,
    connections: params.connections ?? [],
    questions: params.questions ?? [],
    tags: params.tags ?? [],
    created_at: new Date().toISOString(),
  };
}

/**
 * Extract a short summary from discovery content
 */
export function getDiscoverySummary(
  discovery: Discovery,
  maxLength: number = 150
): string {
  const content = discovery.content;
  if (content.length <= maxLength) {
    return content;
  }

  // Try to break at a sentence
  const truncated = content.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastPeriod > maxLength * 0.5) {
    return truncated.slice(0, lastPeriod + 1);
  }
  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}
