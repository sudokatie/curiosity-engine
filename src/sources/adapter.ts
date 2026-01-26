/**
 * Source Adapter - Base interface for all source adapters
 */

import type { SourceContent } from "../types.js";

/**
 * Interface for source adapters
 */
export interface SourceAdapter {
  /** Unique name for this adapter */
  name: string;

  /**
   * Check if this adapter can handle the given target
   */
  canHandle(target: string): boolean;

  /**
   * Fetch content from the target
   */
  fetch(target: string): Promise<SourceContent>;

  /**
   * Extract links from fetched content for thread following
   */
  extractLinks(content: SourceContent): string[];
}

/**
 * Error thrown when a source fetch fails
 */
export class SourceFetchError extends Error {
  constructor(
    public readonly url: string,
    public readonly statusCode?: number,
    message?: string
  ) {
    super(message ?? `Failed to fetch ${url}`);
    this.name = "SourceFetchError";
  }
}

/**
 * Error thrown when no adapter can handle a target
 */
export class NoAdapterError extends Error {
  constructor(public readonly target: string) {
    super(`No adapter can handle target: ${target}`);
    this.name = "NoAdapterError";
  }
}
