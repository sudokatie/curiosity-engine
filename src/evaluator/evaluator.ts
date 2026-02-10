/**
 * Evaluator - Score content for interestingness
 * 
 * Uses LLM when enabled, falls back to heuristics.
 * Caches results to avoid re-scoring identical content.
 */

import type { Database } from "better-sqlite3";
import type {
  SourceContent,
  InterestingnessScore,
  CuriosityConfig,
  LlmConfig,
} from "../types.js";
import { EvaluationCache } from "./cache.js";

// Default endpoints by provider
const PROVIDER_URLS: Record<string, string> = {
  clawdbot: "http://localhost:18789/api/chat",
  ollama: "http://localhost:11434/api/chat",
  openai: "https://api.openai.com/v1/chat/completions",
};

interface LlmEvaluationResponse {
  novelty: number;
  connection_potential: number;
  explanatory_power: number;
  contradiction: number;
  generativity: number;
  reasoning: {
    novelty: string;
    connection_potential: string;
    explanatory_power: string;
    contradiction: string;
    generativity: string;
  };
}

export class Evaluator {
  private weights: CuriosityConfig["interestingness"]["weights"];
  private llmConfig: LlmConfig;
  private cache: EvaluationCache | null = null;

  constructor(config: CuriosityConfig, db?: Database) {
    this.weights = config.interestingness.weights;
    this.llmConfig = config.llm;

    // Initialize cache if enabled and db provided
    if (db && this.llmConfig.cache_evaluations) {
      this.cache = new EvaluationCache(db, this.llmConfig.cache_ttl_hours);
    }
  }

  /**
   * Check if LLM evaluation is enabled
   */
  isLlmEnabled(): boolean {
    return this.llmConfig.enabled;
  }

  /**
   * Evaluate content for interestingness
   * Uses LLM if enabled and available, falls back to heuristics.
   */
  async evaluate(
    content: SourceContent,
    context?: string
  ): Promise<InterestingnessScore> {
    // Check cache first
    if (this.cache) {
      const hash = this.cache.hashContent(content.url, content.text);
      const cached = this.cache.get(hash);
      if (cached) {
        return cached;
      }
    }

    let score: InterestingnessScore;

    if (this.llmConfig.enabled) {
      try {
        score = await this.evaluateWithLlm(content, context);
      } catch (error) {
        console.log(`[WARN] LLM evaluation failed, falling back to heuristics: ${error}`);
        score = this.evaluateFallback(content);
      }
    } else {
      score = this.evaluateFallback(content);
    }

    // Store in cache
    if (this.cache) {
      const hash = this.cache.hashContent(content.url, content.text);
      this.cache.set(hash, score);
    }

    return score;
  }

  /**
   * Evaluate content using LLM
   */
  private async evaluateWithLlm(
    content: SourceContent,
    context?: string
  ): Promise<InterestingnessScore> {
    const prompt = this.buildEvaluationPrompt(content, context);
    const url = this.llmConfig.base_url ?? PROVIDER_URLS[this.llmConfig.provider];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key for OpenAI
    if (this.llmConfig.provider === "openai" && this.llmConfig.api_key) {
      headers["Authorization"] = `Bearer ${this.llmConfig.api_key}`;
    }

    // Build request body based on provider
    const body = this.buildRequestBody(prompt);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const llmResponse = this.parseLlmResponse(data);

    return this.buildScoreFromLlmResponse(llmResponse);
  }

  /**
   * Build request body for different providers
   */
  private buildRequestBody(prompt: string): object {
    const model = this.llmConfig.model;

    switch (this.llmConfig.provider) {
      case "ollama":
        return {
          model: model ?? "llama3.2",
          messages: [{ role: "user", content: prompt }],
          format: "json",
        };
      case "openai":
        return {
          model: model ?? "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        };
      case "clawdbot":
      default:
        return {
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        };
    }
  }

  /**
   * Build the evaluation prompt for the LLM
   */
  private buildEvaluationPrompt(content: SourceContent, context?: string): string {
    const textSample = content.text.slice(0, 3000);

    return `Evaluate this content for interestingness on 5 dimensions. Rate each from 0.0 to 1.0.

CONTENT:
Title: ${content.title}
URL: ${content.url}
Text: ${textSample}

${context ? `CONTEXT: ${context}` : ""}

DIMENSIONS TO RATE:
1. novelty - How new/surprising is this information? (0=common knowledge, 1=highly novel)
2. connection_potential - Does this connect to or bridge different domains? (0=isolated, 1=highly connective)
3. explanatory_power - Does this explain how/why something works? (0=no explanation, 1=deep causal insight)
4. contradiction - Does this challenge existing beliefs or present counterintuitive findings? (0=confirms expectations, 1=highly surprising)
5. generativity - Does this open new questions or research directions? (0=closed topic, 1=highly generative)

Respond with JSON only:
{
  "novelty": <0-1>,
  "connection_potential": <0-1>,
  "explanatory_power": <0-1>,
  "contradiction": <0-1>,
  "generativity": <0-1>,
  "reasoning": {
    "novelty": "<brief explanation>",
    "connection_potential": "<brief explanation>",
    "explanatory_power": "<brief explanation>",
    "contradiction": "<brief explanation>",
    "generativity": "<brief explanation>"
  }
}`;
  }

  /**
   * Parse the LLM response to extract scores
   */
  private parseLlmResponse(data: unknown): LlmEvaluationResponse {
    let content: string;

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;

      // Handle different response formats
      if (typeof obj.content === "string") {
        content = obj.content;
      } else if (typeof obj.message === "object" && obj.message !== null) {
        const msg = obj.message as Record<string, unknown>;
        content = String(msg.content ?? "");
      } else if (Array.isArray(obj.choices) && obj.choices.length > 0) {
        const choice = obj.choices[0] as Record<string, unknown>;
        const message = choice.message as Record<string, unknown>;
        content = String(message?.content ?? "");
      } else if (typeof obj.response === "string") {
        // Ollama format
        content = obj.response;
      } else {
        content = JSON.stringify(data);
      }
    } else {
      content = String(data);
    }

    // Extract JSON from content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in LLM response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as LlmEvaluationResponse;

    // Validate and clamp scores
    const validateScore = (score: unknown): number => {
      const num = Number(score);
      if (isNaN(num)) return 0.5;
      return Math.max(0, Math.min(1, num));
    };

    return {
      novelty: validateScore(parsed.novelty),
      connection_potential: validateScore(parsed.connection_potential),
      explanatory_power: validateScore(parsed.explanatory_power),
      contradiction: validateScore(parsed.contradiction),
      generativity: validateScore(parsed.generativity),
      reasoning: {
        novelty: String(parsed.reasoning?.novelty ?? "LLM evaluated"),
        connection_potential: String(parsed.reasoning?.connection_potential ?? "LLM evaluated"),
        explanatory_power: String(parsed.reasoning?.explanatory_power ?? "LLM evaluated"),
        contradiction: String(parsed.reasoning?.contradiction ?? "LLM evaluated"),
        generativity: String(parsed.reasoning?.generativity ?? "LLM evaluated"),
      },
    };
  }

  /**
   * Build InterestingnessScore from LLM response
   */
  private buildScoreFromLlmResponse(llm: LlmEvaluationResponse): InterestingnessScore {
    const overall =
      llm.novelty * this.weights.novelty +
      llm.connection_potential * this.weights.connection_potential +
      llm.explanatory_power * this.weights.explanatory_power +
      llm.contradiction * this.weights.contradiction +
      llm.generativity * this.weights.generativity;

    return {
      overall,
      novelty: llm.novelty,
      connection_potential: llm.connection_potential,
      explanatory_power: llm.explanatory_power,
      contradiction: llm.contradiction,
      generativity: llm.generativity,
      components: {
        novelty: { score: llm.novelty, reasoning: llm.reasoning.novelty },
        connection_potential: { score: llm.connection_potential, reasoning: llm.reasoning.connection_potential },
        explanatory_power: { score: llm.explanatory_power, reasoning: llm.reasoning.explanatory_power },
        contradiction: { score: llm.contradiction, reasoning: llm.reasoning.contradiction },
        generativity: { score: llm.generativity, reasoning: llm.reasoning.generativity },
      },
    };
  }

  /**
   * Fallback evaluation using simple heuristics
   */
  evaluateFallback(content: SourceContent): InterestingnessScore {
    const text = content.text;
    const links = content.links;

    // Novelty: default to moderate without context
    const novelty = 0.5;

    // Connection potential: based on link diversity
    const uniqueDomains = new Set(
      links.map((l) => {
        try {
          return new URL(l).hostname;
        } catch {
          return "";
        }
      })
    );
    const connectionPotential = Math.min(uniqueDomains.size / 10, 1);

    // Explanatory power: look for explanatory language
    const explanatoryTerms = [
      "because", "therefore", "thus", "explains", "causes",
      "results in", "leads to", "due to", "reason", "mechanism",
    ];
    const lowerText = text.toLowerCase();
    const explanatoryCount = explanatoryTerms.filter((term) =>
      lowerText.includes(term)
    ).length;
    const explanatoryPower = Math.min(explanatoryCount / 5, 1);

    // Contradiction: look for contrasting language
    const contradictionTerms = [
      "however", "but", "contrary", "unlike", "challenges",
      "disputes", "wrong", "incorrect", "misconception", "myth",
    ];
    const contradictionCount = contradictionTerms.filter((term) =>
      lowerText.includes(term)
    ).length;
    const contradiction = Math.min(contradictionCount / 4, 1);

    // Generativity: questions and open-ended phrases
    const questionCount = (text.match(/\?/g) || []).length;
    const openEndedTerms = [
      "might", "could", "perhaps", "possibly", "what if",
      "remains unclear", "future research", "open question",
    ];
    const openEndedCount = openEndedTerms.filter((term) =>
      lowerText.includes(term)
    ).length;
    const generativity = Math.min((questionCount + openEndedCount) / 5, 1);

    // Calculate overall score
    const overall =
      novelty * this.weights.novelty +
      connectionPotential * this.weights.connection_potential +
      explanatoryPower * this.weights.explanatory_power +
      contradiction * this.weights.contradiction +
      generativity * this.weights.generativity;

    return {
      overall,
      novelty,
      connection_potential: connectionPotential,
      explanatory_power: explanatoryPower,
      contradiction,
      generativity,
      components: {
        novelty: {
          score: novelty,
          reasoning: "Default moderate score (no baseline context)",
        },
        connection_potential: {
          score: connectionPotential,
          reasoning: `${uniqueDomains.size} unique domains linked`,
        },
        explanatory_power: {
          score: explanatoryPower,
          reasoning: `${explanatoryCount} explanatory terms found`,
        },
        contradiction: {
          score: contradiction,
          reasoning: `${contradictionCount} contrasting terms found`,
        },
        generativity: {
          score: generativity,
          reasoning: `${questionCount} questions, ${openEndedCount} open-ended phrases`,
        },
      },
    };
  }

  /**
   * Get cache stats if caching is enabled
   */
  getCacheStats(): { total: number; expired: number } | null {
    return this.cache?.stats() ?? null;
  }

  /**
   * Prune expired cache entries
   */
  pruneCache(): number {
    return this.cache?.prune() ?? 0;
  }
}
