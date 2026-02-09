/**
 * Code Adapter - Parse codebases to extract patterns and discoveries
 * 
 * Uses regex-based extraction for functions, classes, comments, TODOs, etc.
 * Designed for discovery, not precise analysis.
 */

import { readdir, stat, readFile } from "node:fs/promises";
import { join, extname, basename, dirname, relative } from "node:path";
import { homedir } from "node:os";
import type { SourceAdapter } from "./adapter.js";
import { SourceFetchError } from "./adapter.js";
import type { SourceContent, CodeSourceConfig } from "../types.js";

const DEFAULT_CONFIG: CodeSourceConfig = {
  enabled: true,
  directories: [],
  languages: ["python", "typescript", "javascript"],
  include_tests: false,
  max_file_size_mb: 1,
};

const MAX_CONTENT_LENGTH = 100000;

// Language to extensions mapping
const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  python: [".py"],
  typescript: [".ts", ".tsx"],
  javascript: [".js", ".jsx", ".mjs"],
  rust: [".rs"],
  go: [".go"],
};

// Patterns for extraction
interface ExtractionPatterns {
  functions: RegExp;
  classes: RegExp;
  imports: RegExp;
  comments: RegExp;
  todos: RegExp;
  docstrings?: RegExp;
}

const PATTERNS: Record<string, ExtractionPatterns> = {
  python: {
    functions: /^(?:async\s+)?def\s+(\w+)\s*\([^)]*\).*?:/gm,
    classes: /^class\s+(\w+)(?:\([^)]*\))?:/gm,
    imports: /^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm,
    comments: /#\s*(.+)$/gm,
    todos: /(?:#|"""|''')\s*(?:TODO|FIXME|XXX|HACK|NOTE):\s*(.+)/gi,
    docstrings: /"""([^"]+)"""|'''([^']+)'''/gs,
  },
  typescript: {
    functions: /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?:=>|:)/gm,
    classes: /(?:export\s+)?class\s+(\w+)/gm,
    imports: /import\s+(?:{[^}]+}|[\w*]+(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]/gm,
    comments: /\/\/\s*(.+)$/gm,
    todos: /(?:\/\/|\/\*)\s*(?:TODO|FIXME|XXX|HACK|NOTE):\s*(.+)/gi,
  },
  javascript: {
    functions: /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?:=>|:)/gm,
    classes: /(?:export\s+)?class\s+(\w+)/gm,
    imports: /import\s+(?:{[^}]+}|[\w*]+(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/gm,
    comments: /\/\/\s*(.+)$/gm,
    todos: /(?:\/\/|\/\*)\s*(?:TODO|FIXME|XXX|HACK|NOTE):\s*(.+)/gi,
  },
  rust: {
    functions: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm,
    classes: /(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/gm,
    imports: /use\s+([^;]+);/gm,
    comments: /\/\/\s*(.+)$/gm,
    todos: /(?:\/\/|\/\*)\s*(?:TODO|FIXME|XXX|HACK|NOTE):\s*(.+)/gi,
  },
  go: {
    functions: /func\s+(?:\([^)]+\)\s+)?(\w+)/gm,
    classes: /type\s+(\w+)\s+(?:struct|interface)/gm,
    imports: /import\s+(?:"([^"]+)"|\(\s*([^)]+)\s*\))/gm,
    comments: /\/\/\s*(.+)$/gm,
    todos: /(?:\/\/|\/\*)\s*(?:TODO|FIXME|XXX|HACK|NOTE):\s*(.+)/gi,
  },
};

interface CodeExtraction {
  functions: string[];
  classes: string[];
  imports: string[];
  comments: string[];
  todos: string[];
  docstrings: string[];
  lineCount: number;
}

function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

function getLanguage(ext: string): string | null {
  for (const [lang, exts] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (exts.includes(ext)) {
      return lang;
    }
  }
  return null;
}

function extractFromCode(code: string, language: string): CodeExtraction {
  const patterns = PATTERNS[language] ?? PATTERNS.javascript;
  const result: CodeExtraction = {
    functions: [],
    classes: [],
    imports: [],
    comments: [],
    todos: [],
    docstrings: [],
    lineCount: code.split("\n").length,
  };

  // Extract functions
  let match;
  const funcRegex = new RegExp(patterns.functions.source, patterns.functions.flags);
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1] ?? match[2];
    if (name && !name.startsWith("_")) {
      result.functions.push(name);
    }
  }

  // Extract classes
  const classRegex = new RegExp(patterns.classes.source, patterns.classes.flags);
  while ((match = classRegex.exec(code)) !== null) {
    if (match[1]) {
      result.classes.push(match[1]);
    }
  }

  // Extract imports
  const importRegex = new RegExp(patterns.imports.source, patterns.imports.flags);
  while ((match = importRegex.exec(code)) !== null) {
    const imp = match[1] ?? match[2] ?? match[3];
    if (imp) {
      result.imports.push(imp.trim());
    }
  }

  // Extract TODOs (high priority)
  const todoRegex = new RegExp(patterns.todos.source, patterns.todos.flags);
  while ((match = todoRegex.exec(code)) !== null) {
    if (match[1]) {
      result.todos.push(match[1].trim());
    }
  }

  // Extract comments (sample - too many to include all)
  const commentRegex = new RegExp(patterns.comments.source, patterns.comments.flags);
  const comments: string[] = [];
  while ((match = commentRegex.exec(code)) !== null && comments.length < 20) {
    const comment = match[1]?.trim();
    if (comment && comment.length > 10 && !comment.startsWith("eslint")) {
      comments.push(comment);
    }
  }
  result.comments = comments;

  // Extract docstrings (Python)
  if (patterns.docstrings) {
    const docRegex = new RegExp(patterns.docstrings.source, patterns.docstrings.flags);
    while ((match = docRegex.exec(code)) !== null && result.docstrings.length < 10) {
      const doc = (match[1] ?? match[2])?.trim();
      if (doc && doc.length > 20) {
        result.docstrings.push(doc.slice(0, 200));
      }
    }
  }

  return result;
}

export class CodeAdapter implements SourceAdapter {
  name = "code";
  private config: CodeSourceConfig;
  private maxBytes: number;
  private allowedExtensions: string[];

  constructor(config?: Partial<CodeSourceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxBytes = this.config.max_file_size_mb * 1024 * 1024;
    
    // Build list of allowed extensions from configured languages
    this.allowedExtensions = this.config.languages.flatMap(
      lang => LANGUAGE_EXTENSIONS[lang] ?? []
    );
  }

  canHandle(target: string): boolean {
    return target.startsWith("code:");
  }

  async fetch(target: string): Promise<SourceContent> {
    const path = expandPath(target.replace(/^code:/, ""));

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

  private async fetchFile(path: string): Promise<SourceContent> {
    const ext = extname(path).toLowerCase();
    const language = getLanguage(ext);

    if (!language || !this.config.languages.includes(language)) {
      throw new SourceFetchError(
        `code:${path}`,
        undefined,
        `Unsupported or unconfigured language for ${ext}`
      );
    }

    const stats = await stat(path);
    if (stats.size > this.maxBytes) {
      throw new SourceFetchError(
        `code:${path}`,
        undefined,
        `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB`
      );
    }

    const code = await readFile(path, "utf-8");
    const extraction = extractFromCode(code, language);

    // Build text summary
    const sections: string[] = [];
    sections.push(`# ${basename(path)} (${language})`);
    sections.push(`Lines: ${extraction.lineCount}`);

    if (extraction.classes.length > 0) {
      sections.push(`\n## Classes\n${extraction.classes.join(", ")}`);
    }

    if (extraction.functions.length > 0) {
      sections.push(`\n## Functions\n${extraction.functions.join(", ")}`);
    }

    if (extraction.todos.length > 0) {
      sections.push(`\n## TODOs\n${extraction.todos.map(t => `- ${t}`).join("\n")}`);
    }

    if (extraction.docstrings.length > 0) {
      sections.push(`\n## Documentation\n${extraction.docstrings.join("\n\n")}`);
    }

    if (extraction.comments.length > 0) {
      sections.push(`\n## Notable Comments\n${extraction.comments.slice(0, 10).map(c => `- ${c}`).join("\n")}`);
    }

    const text = sections.join("\n");

    // Generate links to imported modules
    const links = extraction.imports
      .filter(imp => !imp.startsWith("."))
      .map(imp => `code:${imp}`);

    return {
      url: `code:${path}`,
      title: `${basename(path)} - ${extraction.functions.length} functions, ${extraction.classes.length} classes`,
      text: text.slice(0, MAX_CONTENT_LENGTH),
      links,
      fetched_at: new Date().toISOString(),
      source_type: "code",
    };
  }

  private async fetchDirectory(dirPath: string): Promise<SourceContent> {
    const files = await this.scanDirectory(dirPath);

    if (files.length === 0) {
      throw new SourceFetchError(
        `code:${dirPath}`,
        undefined,
        "No matching source files found"
      );
    }

    // Aggregate extractions
    const allFunctions: string[] = [];
    const allClasses: string[] = [];
    const allTodos: string[] = [];
    const allImports = new Set<string>();
    let totalLines = 0;
    const filesByLang: Record<string, number> = {};

    for (const file of files.slice(0, 100)) {
      try {
        const ext = extname(file).toLowerCase();
        const language = getLanguage(ext);
        if (!language) continue;

        filesByLang[language] = (filesByLang[language] ?? 0) + 1;

        const code = await readFile(file, "utf-8");
        const extraction = extractFromCode(code, language);

        const relPath = relative(dirPath, file);
        allFunctions.push(...extraction.functions.map(f => `${relPath}:${f}`));
        allClasses.push(...extraction.classes.map(c => `${relPath}:${c}`));
        allTodos.push(...extraction.todos.map(t => `${relPath}: ${t}`));
        extraction.imports.forEach(i => allImports.add(i));
        totalLines += extraction.lineCount;
      } catch {
        // Skip files that fail to parse
      }
    }

    // Build summary
    const sections: string[] = [];
    sections.push(`# ${basename(dirPath)}`);
    sections.push(`Files: ${files.length} | Lines: ${totalLines}`);
    
    const langSummary = Object.entries(filesByLang)
      .map(([lang, count]) => `${lang}: ${count}`)
      .join(", ");
    sections.push(`Languages: ${langSummary}`);

    if (allClasses.length > 0) {
      sections.push(`\n## Classes (${allClasses.length})\n${allClasses.slice(0, 30).join("\n")}`);
    }

    if (allFunctions.length > 0) {
      sections.push(`\n## Functions (${allFunctions.length})\n${allFunctions.slice(0, 50).join("\n")}`);
    }

    if (allTodos.length > 0) {
      sections.push(`\n## TODOs (${allTodos.length})\n${allTodos.map(t => `- ${t}`).join("\n")}`);
    }

    const text = sections.join("\n");

    // Generate links to external imports
    const links = [...allImports]
      .filter(imp => !imp.startsWith(".") && !imp.startsWith("/"))
      .slice(0, 50)
      .map(imp => `code:${imp}`);

    return {
      url: `code:${dirPath}`,
      title: `${basename(dirPath)} - ${files.length} files, ${totalLines} lines`,
      text: text.slice(0, MAX_CONTENT_LENGTH),
      links,
      fetched_at: new Date().toISOString(),
      source_type: "code",
    };
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      // Skip hidden, node_modules, __pycache__, etc.
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "__pycache__" ||
        entry.name === "target" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === "vendor"
      ) {
        continue;
      }

      // Skip test files if configured
      if (!this.config.include_tests) {
        if (
          entry.name.includes("test") ||
          entry.name.includes("spec") ||
          entry.name === "tests" ||
          entry.name === "__tests__"
        ) {
          continue;
        }
      }

      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (this.allowedExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  extractLinks(content: SourceContent): string[] {
    // For code, links are mostly internal imports
    return content.links.filter(link => link.startsWith("code:"));
  }
}
