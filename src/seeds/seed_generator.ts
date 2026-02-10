/**
 * Seed Generator - Auto-generate seeds from various sources
 */

import { randomUUID } from "node:crypto";
import type { Seed, Discovery, SeedSource, SeedStatus } from "../types.js";

// Clawdbot gateway endpoint for LLM calls
const CLAWDBOT_GATEWAY_URL = "http://localhost:18789";

interface LlmSeedResponse {
  seeds: Array<{
    content: string;
    priority: number;
  }>;
}

/**
 * Create a seed object with default values
 */
function createSeed(
  content: string,
  source: SeedSource,
  priority: number = 0.5,
  sourceContext: string = ""
): Seed {
  return {
    id: randomUUID(),
    content,
    source,
    source_context: sourceContext || null,
    created_at: new Date().toISOString(),
    priority: Math.max(0, Math.min(1, priority)),
    times_explored: 0,
    last_explored_at: null,
    status: "active" as SeedStatus,
    tags: [],
  };
}

/**
 * Call LLM to extract seeds from text
 */
async function callLlmForSeeds(prompt: string): Promise<LlmSeedResponse | null> {
  try {
    const response = await fetch(`${CLAWDBOT_GATEWAY_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.log(`[WARN] LLM call failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    let content: string;

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      if (typeof obj.content === "string") {
        content = obj.content;
      } else if (Array.isArray(obj.choices) && obj.choices.length > 0) {
        const choice = obj.choices[0] as Record<string, unknown>;
        const message = choice.message as Record<string, unknown>;
        content = String(message?.content ?? "");
      } else {
        content = JSON.stringify(data);
      }
    } else {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as LlmSeedResponse;
  } catch (error) {
    console.log(`[WARN] LLM seed extraction failed: ${error}`);
    return null;
  }
}

/**
 * Generate seeds from conversation text
 * Extracts interesting phrases, questions, and concepts
 */
export async function generateFromConversation(
  text: string,
  useLlm: boolean = false
): Promise<Seed[]> {
  if (useLlm) {
    const prompt = `Extract interesting exploration seeds from this conversation text. 
Look for: questions worth investigating, surprising claims, concepts to explore, connections between ideas.

TEXT:
${text.slice(0, 3000)}

Return JSON:
{
  "seeds": [
    { "content": "exploration topic or question", "priority": 0.0-1.0 }
  ]
}

Return 1-5 seeds, prioritizing novelty and exploration potential.`;

    const result = await callLlmForSeeds(prompt);
    if (result?.seeds) {
      return result.seeds.map((s) =>
        createSeed(s.content, "conversation" as SeedSource, s.priority, text.slice(0, 200))
      );
    }
  }

  // Fallback: extract questions from text
  const questions = text.match(/[^.!?]*\?/g) || [];
  return questions
    .slice(0, 3)
    .map((q) => createSeed(q.trim(), "conversation" as SeedSource, 0.5, text.slice(0, 200)));
}

/**
 * Generate follow-up seeds from a discovery
 * Creates seeds from questions opened and connections found
 */
export async function generateFromDiscovery(
  discovery: Discovery,
  useLlm: boolean = false
): Promise<Seed[]> {
  const seeds: Seed[] = [];

  // Always extract seeds from discovery.questions
  for (const question of discovery.questions) {
    seeds.push(
      createSeed(
        question,
        "discovery" as SeedSource,
        discovery.significance * 0.8,
        `From discovery: ${discovery.title}`
      )
    );
  }

  // Use LLM to generate additional seeds if enabled
  if (useLlm && discovery.content.length > 100) {
    const prompt = `Based on this discovery, suggest additional exploration directions.

DISCOVERY:
Title: ${discovery.title}
Content: ${discovery.content.slice(0, 2000)}
Significance: ${discovery.significance}
Existing questions: ${discovery.questions.join(", ")}

Return JSON:
{
  "seeds": [
    { "content": "follow-up exploration topic or question", "priority": 0.0-1.0 }
  ]
}

Return 1-3 seeds that go BEYOND the existing questions. Focus on unexpected angles, deeper implications, or connections to other domains.`;

    const result = await callLlmForSeeds(prompt);
    if (result?.seeds) {
      for (const s of result.seeds) {
        seeds.push(
          createSeed(
            s.content,
            "discovery" as SeedSource,
            s.priority,
            `LLM follow-up from: ${discovery.title}`
          )
        );
      }
    }
  }

  return seeds;
}

/**
 * Generate seeds from observed patterns across discoveries
 * Notices recurring themes and suggests meta-exploration
 */
export async function generateFromPatterns(
  discoveries: Discovery[],
  useLlm: boolean = false
): Promise<Seed[]> {
  if (discoveries.length < 3) {
    return []; // Need enough data for pattern detection
  }

  if (useLlm) {
    const summaries = discoveries
      .slice(0, 10)
      .map((d) => `- ${d.title} (${d.significance.toFixed(2)}): ${d.content.slice(0, 150)}`)
      .join("\n");

    const prompt = `Analyze these discoveries for patterns and suggest meta-exploration seeds.

DISCOVERIES:
${summaries}

Return JSON:
{
  "seeds": [
    { "content": "meta-exploration topic based on patterns", "priority": 0.0-1.0 }
  ]
}

Look for:
- Recurring themes or concepts
- Tensions or contradictions between discoveries
- Gaps in understanding
- Connections that bridge multiple discoveries
- Questions that emerge from the collection as a whole

Return 1-3 high-priority meta-seeds.`;

    const result = await callLlmForSeeds(prompt);
    if (result?.seeds) {
      return result.seeds.map((s) =>
        createSeed(
          s.content,
          "observation" as SeedSource,
          s.priority,
          `Pattern detected across ${discoveries.length} discoveries`
        )
      );
    }
  }

  // Fallback: extract common tags
  const tagCounts = new Map<string, number>();
  for (const d of discoveries) {
    for (const tag of d.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const commonTags = [...tagCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return commonTags.map(([tag, count]) =>
    createSeed(
      `Deep dive into ${tag}`,
      "observation" as SeedSource,
      0.6,
      `Appeared in ${count} discoveries`
    )
  );
}
