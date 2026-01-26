/**
 * Seed Generator - Auto-generate seeds from various sources
 * 
 * TODO: Implement in future versions
 */

import type { Seed, Discovery } from "../types.js";

/**
 * Generate seeds from conversation text
 * Extracts interesting phrases, questions, and concepts
 */
export async function generateFromConversation(
  _text: string
): Promise<Seed[]> {
  // TODO: Use LLM to extract interesting seeds from conversation
  return [];
}

/**
 * Generate follow-up seeds from a discovery
 * Creates seeds from questions opened and connections found
 */
export async function generateFromDiscovery(
  _discovery: Discovery
): Promise<Seed[]> {
  // TODO: Generate seeds from discovery.questions and connections
  return [];
}

/**
 * Generate seeds from observed patterns
 * Notices recurring themes and suggests exploration
 */
export async function generateFromPatterns(
  _discoveries: Discovery[]
): Promise<Seed[]> {
  // TODO: Analyze discoveries for patterns and generate meta-seeds
  return [];
}
