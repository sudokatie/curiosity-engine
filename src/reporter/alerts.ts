/**
 * Alert Manager - Generate breakthrough alerts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Discovery } from "../types.js";
import { getDiscoverySummary } from "../journal/discovery.js";

export class AlertManager {
  private sentAlerts: Set<string> = new Set();
  private filePath: string;
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "alerts.json");
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await readFile(this.filePath, "utf-8");
      const data = JSON.parse(content);
      this.sentAlerts = new Set(data.sent ?? []);
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.sentAlerts = new Set();
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  async save(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const data = {
      sent: Array.from(this.sentAlerts),
      last_updated: new Date().toISOString(),
    };

    await writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Check if a discovery should trigger an alert
   */
  async shouldAlert(
    discovery: Discovery,
    threshold: number
  ): Promise<boolean> {
    await this.load();

    // Check significance threshold
    if (discovery.significance < threshold) {
      return false;
    }

    // Check if already alerted
    if (this.sentAlerts.has(discovery.id)) {
      return false;
    }

    return true;
  }

  /**
   * Format an alert message
   */
  formatAlert(discovery: Discovery): string {
    const significance = (discovery.significance * 100).toFixed(0);
    const summary = getDiscoverySummary(discovery, 100);

    return `[DISCOVERY] ${discovery.title} (${significance}%)\n${summary}`;
  }

  /**
   * Mark a discovery as alerted
   */
  async markAlerted(discoveryId: string): Promise<void> {
    await this.load();
    this.sentAlerts.add(discoveryId);
    await this.save();
  }

  /**
   * Get count of sent alerts
   */
  async getSentCount(): Promise<number> {
    await this.load();
    return this.sentAlerts.size;
  }
}
