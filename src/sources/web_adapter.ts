/**
 * Web Adapter - Fetch and parse web content
 */

import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import type { SourceAdapter } from "./adapter.js";
import { SourceFetchError } from "./adapter.js";
import type { SourceContent, WebSourceConfig } from "../types.js";

const DEFAULT_CONFIG: WebSourceConfig = {
  enabled: true,
  blocked_domains: [],
  preferred_domains: [],
  respect_robots: true,
};

const USER_AGENT = "CuriosityEngine/0.1 (+https://github.com/curiosity-engine)";
const MAX_CONTENT_LENGTH = 100000; // 100KB

export class WebAdapter implements SourceAdapter {
  name = "web";
  private config: WebSourceConfig;
  private fetchDelayMs: number;
  private timeoutMs: number;
  private lastFetchTime = 0;

  constructor(
    config?: Partial<WebSourceConfig>,
    options?: { fetchDelayMs?: number; timeoutMs?: number }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fetchDelayMs = options?.fetchDelayMs ?? 1000;
    this.timeoutMs = options?.timeoutMs ?? 30000;
  }

  canHandle(target: string): boolean {
    return target.startsWith("http://") || target.startsWith("https://");
  }

  async fetch(target: string): Promise<SourceContent> {
    // Enforce rate limiting
    const now = Date.now();
    const elapsed = now - this.lastFetchTime;
    if (elapsed < this.fetchDelayMs) {
      await this.delay(this.fetchDelayMs - elapsed);
    }

    // Check blocked domains
    try {
      const url = new URL(target);
      if (this.isBlocked(url.hostname)) {
        throw new SourceFetchError(target, undefined, "Domain is blocked");
      }
    } catch (error) {
      if (error instanceof SourceFetchError) throw error;
      throw new SourceFetchError(target, undefined, "Invalid URL");
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(target, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      this.lastFetchTime = Date.now();

      if (!response.ok) {
        throw new SourceFetchError(target, response.status);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        throw new SourceFetchError(
          target,
          undefined,
          `Unsupported content type: ${contentType}`
        );
      }

      let html = await response.text();

      // Limit content size
      if (html.length > MAX_CONTENT_LENGTH) {
        html = html.slice(0, MAX_CONTENT_LENGTH);
      }

      // Parse with Readability for main content
      const dom = new JSDOM(html, { url: target });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      // Fall back to cheerio if Readability fails
      const $ = cheerio.load(html);
      const title = article?.title ?? $("title").text().trim() ?? target;
      const text = article?.textContent ?? $("body").text().trim() ?? "";

      // Extract links
      const links: string[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          try {
            const absoluteUrl = new URL(href, target).toString();
            if (absoluteUrl.startsWith("http")) {
              links.push(absoluteUrl);
            }
          } catch {
            // Ignore invalid URLs
          }
        }
      });

      return {
        url: target,
        title,
        text: text.slice(0, 50000), // Limit text size
        links: [...new Set(links)], // Deduplicate
        fetched_at: new Date().toISOString(),
        source_type: "web",
      };
    } catch (error) {
      if (error instanceof SourceFetchError) throw error;

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new SourceFetchError(target, undefined, "Request timeout");
        }
        throw new SourceFetchError(target, undefined, error.message);
      }
      throw new SourceFetchError(target);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  extractLinks(content: SourceContent): string[] {
    return content.links.filter((link) => {
      try {
        const url = new URL(link);
        return !this.isBlocked(url.hostname);
      } catch {
        return false;
      }
    });
  }

  private isBlocked(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    return this.config.blocked_domains.some(
      (domain) =>
        normalized === domain.toLowerCase() ||
        normalized.endsWith("." + domain.toLowerCase())
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
