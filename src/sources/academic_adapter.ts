/**
 * Academic Adapter - Search and fetch academic papers from arXiv
 * 
 * Uses the arXiv API (Atom feed) for searching and paper retrieval.
 * No API key required.
 */

import type { SourceAdapter } from "./adapter.js";
import { SourceFetchError } from "./adapter.js";
import type { SourceContent, AcademicSourceConfig } from "../types.js";

const DEFAULT_CONFIG: AcademicSourceConfig = {
  enabled: true,
  max_results: 10,
  categories: [],
};

const ARXIV_API = "https://export.arxiv.org/api/query";
const MAX_CONTENT_LENGTH = 100000;

// Rate limiting for arXiv (they request max 1 request per 3 seconds)
let lastFetchTime = 0;
const FETCH_DELAY_MS = 3000;

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  categories: string[];
  published: string;
  updated: string;
  pdfLink: string;
  absLink: string;
}

/**
 * Parse arXiv Atom XML response
 */
function parseArxivResponse(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  
  // Simple regex-based parsing (good enough for Atom feeds)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    
    const getId = (s: string) => s.match(/<id>([^<]+)<\/id>/)?.[1] ?? "";
    const getTitle = (s: string) => s.match(/<title>([^<]+)<\/title>/)?.[1]?.trim().replace(/\s+/g, " ") ?? "";
    const getSummary = (s: string) => s.match(/<summary>([^<]+)<\/summary>/)?.[1]?.trim().replace(/\s+/g, " ") ?? "";
    const getPublished = (s: string) => s.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    const getUpdated = (s: string) => s.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? "";
    
    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }
    
    // Extract categories
    const categories: string[] = [];
    const catRegex = /<category[^>]*term="([^"]+)"/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }
    
    // Extract links
    let pdfLink = "";
    let absLink = "";
    const linkRegex = /<link[^>]*href="([^"]+)"[^>]*(?:title="([^"]*)")?[^>]*(?:type="([^"]*)")?/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(entry)) !== null) {
      const href = linkMatch[1];
      const title = linkMatch[2] ?? "";
      if (title === "pdf" || href.includes("/pdf/")) {
        pdfLink = href;
      } else if (href.includes("/abs/")) {
        absLink = href;
      }
    }
    
    // Extract arXiv ID from the full URL
    const id = getId(entry).replace("http://arxiv.org/abs/", "");
    
    entries.push({
      id,
      title: getTitle(entry),
      summary: getSummary(entry),
      authors,
      categories,
      published: getPublished(entry),
      updated: getUpdated(entry),
      pdfLink,
      absLink: absLink || `https://arxiv.org/abs/${id}`,
    });
  }
  
  return entries;
}

export class AcademicAdapter implements SourceAdapter {
  name = "academic";
  private config: AcademicSourceConfig;

  constructor(config?: Partial<AcademicSourceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle arxiv: prefix
   * - arxiv:search:query - search for papers
   * - arxiv:2301.00234 - fetch specific paper
   */
  canHandle(target: string): boolean {
    return target.startsWith("arxiv:");
  }

  async fetch(target: string): Promise<SourceContent> {
    // Rate limiting
    const now = Date.now();
    const elapsed = now - lastFetchTime;
    if (elapsed < FETCH_DELAY_MS) {
      await this.delay(FETCH_DELAY_MS - elapsed);
    }
    lastFetchTime = Date.now();

    const query = target.replace(/^arxiv:/, "");

    try {
      if (query.startsWith("search:")) {
        return await this.searchPapers(query.replace("search:", ""));
      } else {
        return await this.fetchPaper(query);
      }
    } catch (error) {
      if (error instanceof SourceFetchError) throw error;
      throw new SourceFetchError(
        target,
        undefined,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Search arXiv for papers matching query
   */
  private async searchPapers(query: string): Promise<SourceContent> {
    // Build search query
    let searchQuery = `all:${encodeURIComponent(query)}`;
    
    // Add category filter if configured
    if (this.config.categories.length > 0) {
      const catFilter = this.config.categories
        .map(c => `cat:${c}`)
        .join("+OR+");
      searchQuery = `(${searchQuery})+AND+(${catFilter})`;
    }

    const url = `${ARXIV_API}?search_query=${searchQuery}&start=0&max_results=${this.config.max_results}&sortBy=relevance&sortOrder=descending`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CuriosityEngine/0.1 (academic research tool)",
      },
    });

    if (!response.ok) {
      throw new SourceFetchError(
        `arxiv:search:${query}`,
        response.status,
        `arXiv API error: ${response.statusText}`
      );
    }

    const xml = await response.text();
    const entries = parseArxivResponse(xml);

    if (entries.length === 0) {
      throw new SourceFetchError(
        `arxiv:search:${query}`,
        undefined,
        "No papers found"
      );
    }

    // Build text summary
    const sections: string[] = [];
    sections.push(`# arXiv Search: "${query}"`);
    sections.push(`Found ${entries.length} papers\n`);

    for (const entry of entries) {
      sections.push(`## ${entry.title}`);
      sections.push(`**Authors:** ${entry.authors.join(", ")}`);
      sections.push(`**Categories:** ${entry.categories.join(", ")}`);
      sections.push(`**Published:** ${entry.published.split("T")[0]}`);
      sections.push(`**arXiv:** ${entry.id}`);
      sections.push(`\n${entry.summary}\n`);
    }

    const text = sections.join("\n");

    // Links to individual papers
    const links = entries.map(e => `arxiv:${e.id}`);

    return {
      url: `arxiv:search:${query}`,
      title: `arXiv Search: ${query} (${entries.length} results)`,
      text: text.slice(0, MAX_CONTENT_LENGTH),
      links,
      fetched_at: new Date().toISOString(),
      source_type: "academic",
    };
  }

  /**
   * Fetch a specific paper by arXiv ID
   */
  private async fetchPaper(arxivId: string): Promise<SourceContent> {
    // Clean up ID (handle various formats)
    const cleanId = arxivId.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
    
    const url = `${ARXIV_API}?id_list=${cleanId}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CuriosityEngine/0.1 (academic research tool)",
      },
    });

    if (!response.ok) {
      throw new SourceFetchError(
        `arxiv:${arxivId}`,
        response.status,
        `arXiv API error: ${response.statusText}`
      );
    }

    const xml = await response.text();
    const entries = parseArxivResponse(xml);

    if (entries.length === 0) {
      throw new SourceFetchError(
        `arxiv:${arxivId}`,
        undefined,
        "Paper not found"
      );
    }

    const entry = entries[0];

    // Build detailed paper content
    const sections: string[] = [];
    sections.push(`# ${entry.title}`);
    sections.push(`\n**Authors:** ${entry.authors.join(", ")}`);
    sections.push(`**arXiv ID:** ${entry.id}`);
    sections.push(`**Categories:** ${entry.categories.join(", ")}`);
    sections.push(`**Published:** ${entry.published.split("T")[0]}`);
    sections.push(`**Updated:** ${entry.updated.split("T")[0]}`);
    sections.push(`**PDF:** ${entry.pdfLink}`);
    sections.push(`**Abstract Page:** ${entry.absLink}`);
    sections.push(`\n## Abstract\n\n${entry.summary}`);

    const text = sections.join("\n");

    // Links to related searches based on categories
    const links = entry.categories.slice(0, 3).map(
      cat => `arxiv:search:cat:${cat}`
    );

    return {
      url: `arxiv:${entry.id}`,
      title: entry.title,
      text: text.slice(0, MAX_CONTENT_LENGTH),
      links,
      fetched_at: new Date().toISOString(),
      source_type: "academic",
    };
  }

  extractLinks(content: SourceContent): string[] {
    // Return arXiv links and any web links in the content
    const arxivLinks = content.links.filter(l => l.startsWith("arxiv:"));
    
    // Also extract any URLs from the text (e.g., project pages)
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const webLinks = content.text.match(urlRegex) ?? [];
    
    return [...arxivLinks, ...webLinks.filter(l => !l.includes("arxiv.org"))];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
