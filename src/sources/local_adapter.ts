/**
 * Local Adapter - Fetch and parse local files (PDF, Markdown, plain text)
 */

import { readdir, stat, readFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { homedir } from "node:os";
import matter from "gray-matter";
import { PDFParse } from "pdf-parse";
import type { SourceAdapter } from "./adapter.js";
import { SourceFetchError } from "./adapter.js";
import type { SourceContent, LocalSourceConfig } from "../types.js";

const DEFAULT_CONFIG: LocalSourceConfig = {
  enabled: true,
  directories: [],
  extensions: [".md", ".txt", ".pdf"],
  watch: false,
  max_file_size_mb: 10,
};

const MAX_CONTENT_LENGTH = 100000; // 100KB

/**
 * Expand ~ to home directory
 */
function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Extract URLs from text content
 */
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const matches = text.match(urlRegex) ?? [];
  return [...new Set(matches)];
}

/**
 * Extract markdown links from text
 */
function extractMarkdownLinks(text: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const url = match[2];
    if (url.startsWith("http://") || url.startsWith("https://")) {
      links.push(url);
    }
  }
  return links;
}

export class LocalAdapter implements SourceAdapter {
  name = "local";
  private config: LocalSourceConfig;
  private maxBytes: number;

  constructor(config?: Partial<LocalSourceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxBytes = this.config.max_file_size_mb * 1024 * 1024;
  }

  /**
   * Check if target is a local file/directory target
   * Format: local:/path/to/file or local:~/Documents
   */
  canHandle(target: string): boolean {
    return target.startsWith("local:");
  }

  /**
   * Fetch content from local file or directory
   */
  async fetch(target: string): Promise<SourceContent> {
    // Parse target path
    const path = expandPath(target.replace(/^local:/, ""));

    try {
      const stats = await stat(path);

      if (stats.isDirectory()) {
        return await this.fetchDirectory(path);
      } else if (stats.isFile()) {
        return await this.fetchFile(path);
      } else {
        throw new SourceFetchError(target, undefined, "Not a file or directory");
      }
    } catch (error) {
      if (error instanceof SourceFetchError) throw error;
      if (error instanceof Error && "code" in error) {
        if (error.code === "ENOENT") {
          throw new SourceFetchError(target, undefined, "File or directory not found");
        }
        if (error.code === "EACCES") {
          throw new SourceFetchError(target, undefined, "Permission denied");
        }
      }
      throw new SourceFetchError(
        target,
        undefined,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Fetch content from a single file
   */
  private async fetchFile(path: string): Promise<SourceContent> {
    const ext = extname(path).toLowerCase();
    const name = basename(path);

    // Check extension is allowed
    if (!this.config.extensions.includes(ext)) {
      throw new SourceFetchError(
        `local:${path}`,
        undefined,
        `Unsupported file type: ${ext}`
      );
    }

    // Check file size
    const stats = await stat(path);
    if (stats.size > this.maxBytes) {
      throw new SourceFetchError(
        `local:${path}`,
        undefined,
        `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB exceeds ${this.config.max_file_size_mb}MB limit`
      );
    }

    let title = name;
    let text = "";
    let links: string[] = [];

    if (ext === ".pdf") {
      const buffer = await readFile(path);
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      title = (infoResult?.info?.Title as string) ?? name;
      text = textResult.text;
      links = extractUrls(text);
      await parser.destroy();
    } else if (ext === ".md") {
      const content = await readFile(path, "utf-8");
      const parsed = matter(content);
      title = (parsed.data?.title as string) ?? name;
      text = parsed.content;
      links = [
        ...extractMarkdownLinks(content),
        ...extractUrls(parsed.content),
      ];
    } else {
      // Plain text
      text = await readFile(path, "utf-8");
      links = extractUrls(text);
    }

    // Truncate if too long
    if (text.length > MAX_CONTENT_LENGTH) {
      text = text.slice(0, MAX_CONTENT_LENGTH);
    }

    return {
      url: `local:${path}`,
      title,
      text,
      links: [...new Set(links)],
      fetched_at: new Date().toISOString(),
      source_type: "local",
    };
  }

  /**
   * Fetch content from a directory (aggregate all files)
   */
  private async fetchDirectory(dirPath: string): Promise<SourceContent> {
    const files = await this.scanDirectory(dirPath);

    if (files.length === 0) {
      throw new SourceFetchError(
        `local:${dirPath}`,
        undefined,
        `No matching files found in directory`
      );
    }

    // Aggregate content from all files
    const allText: string[] = [];
    const allLinks: string[] = [];
    const titles: string[] = [];

    for (const file of files.slice(0, 50)) {
      // Limit to first 50 files
      try {
        const content = await this.fetchFile(file);
        titles.push(content.title);
        allText.push(`## ${content.title}\n\n${content.text.slice(0, 5000)}`);
        allLinks.push(...content.links);
      } catch {
        // Skip files that fail to parse
      }
    }

    const text = allText.join("\n\n---\n\n");

    return {
      url: `local:${dirPath}`,
      title: `Directory: ${basename(dirPath)} (${files.length} files)`,
      text: text.slice(0, MAX_CONTENT_LENGTH),
      links: [...new Set(allLinks)],
      fetched_at: new Date().toISOString(),
      source_type: "local",
    };
  }

  /**
   * Recursively scan directory for matching files
   */
  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      // Skip hidden files/directories
      if (entry.name.startsWith(".")) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await this.scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (this.config.extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Extract links from fetched content
   */
  extractLinks(content: SourceContent): string[] {
    // Return both web links and local file references
    const localLinks: string[] = [];
    const webLinks = content.links.filter((link) => {
      if (link.startsWith("local:")) {
        localLinks.push(link);
        return false;
      }
      return true;
    });

    // For local content, also look for relative file references
    const relativeRefs = content.text.match(/\[\[([^\]]+)\]\]/g) ?? [];
    const basePath = content.url.startsWith("local:")
      ? dirname(content.url.replace(/^local:/, ""))
      : "";

    for (const ref of relativeRefs) {
      const filename = ref.slice(2, -2);
      const possiblePath = join(basePath, filename);
      // Only add if it looks like a file reference
      if (!filename.includes("http") && filename.length < 100) {
        localLinks.push(`local:${possiblePath}`);
      }
    }

    return [...webLinks, ...localLinks];
  }
}
