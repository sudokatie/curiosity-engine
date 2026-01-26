/**
 * Path Tracker - Track exploration path for provenance
 */

import type { ExplorationStep } from "../types.js";

export class PathTracker {
  private steps: ExplorationStep[] = [];

  /**
   * Add a step to the path
   */
  addStep(step: ExplorationStep): void {
    this.steps.push(step);
  }

  /**
   * Get all steps in the path
   */
  getPath(): ExplorationStep[] {
    return [...this.steps];
  }

  /**
   * Get current depth (number of steps)
   */
  getDepth(): number {
    return this.steps.length;
  }

  /**
   * Get human-readable summary of the path
   */
  getSummary(): string {
    if (this.steps.length === 0) {
      return "(no steps yet)";
    }

    return this.steps
      .map((step) => {
        if (step.url) {
          try {
            const url = new URL(step.url);
            return url.hostname + url.pathname.slice(0, 30);
          } catch {
            return step.url.slice(0, 40);
          }
        }
        return step.content_summary.slice(0, 40);
      })
      .join(" -> ");
  }

  /**
   * Get the path as an array of strings for seed_path
   */
  toSeedPath(): string[] {
    return this.steps.map((step) => step.url ?? step.content_summary);
  }

  /**
   * Get the last step
   */
  getLastStep(): ExplorationStep | null {
    if (this.steps.length === 0) return null;
    return this.steps[this.steps.length - 1];
  }

  /**
   * Clear all steps
   */
  clear(): void {
    this.steps = [];
  }
}
