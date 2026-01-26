import { describe, it, expect } from "vitest";
import { Evaluator } from "../../src/evaluator/evaluator.js";
import { parseEvaluationResponse } from "../../src/evaluator/prompts.js";
import { getDefaultConfig } from "../../src/config.js";
import type { SourceContent } from "../../src/types.js";

describe("Evaluator", () => {
  const config = getDefaultConfig();
  const evaluator = new Evaluator(config);

  describe("evaluateFallback", () => {
    it("returns score between 0 and 1", () => {
      const content: SourceContent = {
        url: "https://example.com",
        title: "Test Article",
        text: "This is a simple test article without much content.",
        links: [],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const score = evaluator.evaluateFallback(content);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(1);
      expect(score.novelty).toBeGreaterThanOrEqual(0);
      expect(score.novelty).toBeLessThanOrEqual(1);
    });

    it("scores higher connection potential for more links", () => {
      const fewLinks: SourceContent = {
        url: "https://example.com",
        title: "Few Links",
        text: "Content here.",
        links: ["https://a.com", "https://b.com"],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const manyLinks: SourceContent = {
        url: "https://example.com",
        title: "Many Links",
        text: "Content here.",
        links: [
          "https://a.com",
          "https://b.com",
          "https://c.com",
          "https://d.com",
          "https://e.com",
          "https://f.com",
          "https://g.com",
          "https://h.com",
        ],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const fewScore = evaluator.evaluateFallback(fewLinks);
      const manyScore = evaluator.evaluateFallback(manyLinks);

      expect(manyScore.connection_potential).toBeGreaterThan(
        fewScore.connection_potential
      );
    });

    it("scores higher generativity for questions", () => {
      const noQuestions: SourceContent = {
        url: "https://example.com",
        title: "No Questions",
        text: "This is a statement. Another statement. Facts only.",
        links: [],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const hasQuestions: SourceContent = {
        url: "https://example.com",
        title: "Has Questions",
        text: "What if we tried this? How does that work? Why is that true?",
        links: [],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const noQScore = evaluator.evaluateFallback(noQuestions);
      const hasQScore = evaluator.evaluateFallback(hasQuestions);

      expect(hasQScore.generativity).toBeGreaterThan(noQScore.generativity);
    });

    it("includes reasoning in components", () => {
      const content: SourceContent = {
        url: "https://example.com",
        title: "Test",
        text: "Some content here.",
        links: [],
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };

      const score = evaluator.evaluateFallback(content);

      expect(score.components.novelty.reasoning).toBeDefined();
      expect(score.components.connection_potential.reasoning).toBeDefined();
    });
  });
});

describe("parseEvaluationResponse", () => {
  const weights = {
    novelty: 0.3,
    connection_potential: 0.25,
    explanatory_power: 0.2,
    contradiction: 0.15,
    generativity: 0.1,
  };

  it("parses valid JSON response", () => {
    const response = JSON.stringify({
      novelty: 0.7,
      connection_potential: 0.5,
      explanatory_power: 0.6,
      contradiction: 0.3,
      generativity: 0.8,
      reasoning: {
        novelty: "Unique perspective",
      },
    });

    const score = parseEvaluationResponse(response, weights);

    expect(score).not.toBeNull();
    expect(score?.novelty).toBe(0.7);
    expect(score?.generativity).toBe(0.8);
  });

  it("extracts JSON from markdown code block", () => {
    const response = `Here's the evaluation:

\`\`\`json
{
  "novelty": 0.5,
  "connection_potential": 0.5,
  "explanatory_power": 0.5,
  "contradiction": 0.5,
  "generativity": 0.5
}
\`\`\`

That's my assessment.`;

    const score = parseEvaluationResponse(response, weights);
    expect(score).not.toBeNull();
    expect(score?.novelty).toBe(0.5);
  });

  it("calculates overall score from weights", () => {
    const response = JSON.stringify({
      novelty: 1.0,
      connection_potential: 0,
      explanatory_power: 0,
      contradiction: 0,
      generativity: 0,
    });

    const score = parseEvaluationResponse(response, weights);

    // Overall should be 1.0 * 0.3 = 0.3
    expect(score?.overall).toBeCloseTo(0.3);
  });

  it("returns null for invalid JSON", () => {
    const score = parseEvaluationResponse("not json", weights);
    expect(score).toBeNull();
  });

  it("returns null for missing fields", () => {
    const response = JSON.stringify({
      novelty: 0.5,
      // Missing other fields
    });

    const score = parseEvaluationResponse(response, weights);
    expect(score).toBeNull();
  });

  it("returns null for out-of-range values", () => {
    const response = JSON.stringify({
      novelty: 1.5, // Invalid
      connection_potential: 0.5,
      explanatory_power: 0.5,
      contradiction: 0.5,
      generativity: 0.5,
    });

    const score = parseEvaluationResponse(response, weights);
    expect(score).toBeNull();
  });
});
