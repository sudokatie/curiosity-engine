/**
 * Source Registry - Registry of available source adapters
 */

import type { SourceAdapter } from "./adapter.js";
import { NoAdapterError } from "./adapter.js";
import type { SourceContent } from "../types.js";

export class SourceRegistry {
  private adapters: SourceAdapter[] = [];

  /**
   * Register a source adapter
   */
  register(adapter: SourceAdapter): void {
    // Check for duplicate names
    const existing = this.adapters.find((a) => a.name === adapter.name);
    if (existing) {
      throw new Error(`Adapter with name "${adapter.name}" already registered`);
    }
    this.adapters.push(adapter);
  }

  /**
   * Get an adapter that can handle the target
   */
  getAdapter(target: string): SourceAdapter | null {
    return this.adapters.find((a) => a.canHandle(target)) ?? null;
  }

  /**
   * Fetch content from a target using the appropriate adapter
   */
  async fetch(target: string): Promise<SourceContent> {
    const adapter = this.getAdapter(target);
    if (!adapter) {
      throw new NoAdapterError(target);
    }
    return adapter.fetch(target);
  }

  /**
   * Extract links from content using the appropriate adapter
   */
  extractLinks(content: SourceContent, target: string): string[] {
    const adapter = this.getAdapter(target);
    if (!adapter) {
      return [];
    }
    return adapter.extractLinks(content);
  }

  /**
   * List all registered adapters
   */
  listAdapters(): string[] {
    return this.adapters.map((a) => a.name);
  }

  /**
   * Check if any adapter can handle the target
   */
  canHandle(target: string): boolean {
    return this.getAdapter(target) !== null;
  }
}
