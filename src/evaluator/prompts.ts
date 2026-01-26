/**
 * Evaluation Prompts - LLM prompts for interestingness evaluation
 */

import type { SourceContent, InterestingnessScore } from "../types.js";

export const MAX_CONTENT_LENGTH = 4000;

export const EVALUATION_SYSTEM_PROMPT = `You are an interestingness evaluator for a curiosity-driven exploration system.

Given content, score it on these dimensions (each 0.0 to 1.0):

- novelty: How different is this from common knowledge? High for unique insights, low for well-known facts.
- connection_potential: Does this connect to other domains unexpectedly? High for cross-disciplinary links.
- explanatory_power: Does this help explain other phenomena? High for foundational insights.
- contradiction: Does this challenge existing beliefs or assumptions? High for paradigm-shifting ideas.
- generativity: Does this open new questions worth exploring? High for fertile ground.

Also provide brief reasoning for each score.

Return ONLY valid JSON in this format:
{
  "novelty": 0.X,
  "connection_potential": 0.X,
  "explanatory_power": 0.X,
  "contradiction": 0.X,
  "generativity": 0.X,
  "reasoning": {
    "novelty": "brief explanation",
    "connection_potential": "brief explanation",
    "explanatory_power": "brief explanation",
    "contradiction": "brief explanation",
    "generativity": "brief explanation"
  }
}`;

/**
 * Format content for evaluation prompt
 */
export function formatEvaluationPrompt(
  content: SourceContent,
  context?: string
): string {
  let text = content.text;
  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH) + "...";
  }

  let prompt = `Evaluate this content for interestingness:\n\n`;
  prompt += `Title: ${content.title}\n`;
  prompt += `URL: ${content.url}\n\n`;
  prompt += `Content:\n${text}\n`;

  if (context) {
    prompt += `\nContext: ${context}\n`;
  }

  return prompt;
}

interface EvaluationResponse {
  novelty: number;
  connection_potential: number;
  explanatory_power: number;
  contradiction: number;
  generativity: number;
  reasoning?: {
    novelty?: string;
    connection_potential?: string;
    explanatory_power?: string;
    contradiction?: string;
    generativity?: string;
  };
}

/**
 * Parse LLM response into InterestingnessScore
 */
export function parseEvaluationResponse(
  response: string,
  weights: {
    novelty: number;
    connection_potential: number;
    explanatory_power: number;
    contradiction: number;
    generativity: number;
  }
): InterestingnessScore | null {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed: EvaluationResponse = JSON.parse(jsonStr.trim());

    // Validate all required fields
    const dimensions = [
      "novelty",
      "connection_potential",
      "explanatory_power",
      "contradiction",
      "generativity",
    ] as const;

    for (const dim of dimensions) {
      if (typeof parsed[dim] !== "number") {
        return null;
      }
      if (parsed[dim] < 0 || parsed[dim] > 1) {
        return null;
      }
    }

    // Calculate overall score from weighted components
    const overall =
      parsed.novelty * weights.novelty +
      parsed.connection_potential * weights.connection_potential +
      parsed.explanatory_power * weights.explanatory_power +
      parsed.contradiction * weights.contradiction +
      parsed.generativity * weights.generativity;

    return {
      overall,
      novelty: parsed.novelty,
      connection_potential: parsed.connection_potential,
      explanatory_power: parsed.explanatory_power,
      contradiction: parsed.contradiction,
      generativity: parsed.generativity,
      components: {
        novelty: {
          score: parsed.novelty,
          reasoning: parsed.reasoning?.novelty ?? "",
        },
        connection_potential: {
          score: parsed.connection_potential,
          reasoning: parsed.reasoning?.connection_potential ?? "",
        },
        explanatory_power: {
          score: parsed.explanatory_power,
          reasoning: parsed.reasoning?.explanatory_power ?? "",
        },
        contradiction: {
          score: parsed.contradiction,
          reasoning: parsed.reasoning?.contradiction ?? "",
        },
        generativity: {
          score: parsed.generativity,
          reasoning: parsed.reasoning?.generativity ?? "",
        },
      },
    };
  } catch {
    return null;
  }
}
