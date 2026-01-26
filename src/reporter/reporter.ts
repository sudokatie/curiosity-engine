/**
 * Reporter - Surface discoveries to user
 */

import type { Discovery, CuriosityConfig } from "../types.js";
import type { Journal } from "../journal/journal.js";
import { generateDigest } from "./digest.js";
import { AlertManager } from "./alerts.js";

export class Reporter {
  private config: CuriosityConfig;
  private journal: Journal;
  private alerts: AlertManager;

  constructor(config: CuriosityConfig, journal: Journal) {
    this.config = config;
    this.journal = journal;
    this.alerts = new AlertManager(config.data_dir);
  }

  /**
   * Generate and output daily digest
   */
  async sendDigest(since?: Date): Promise<string> {
    const digest = await generateDigest(this.journal, since);

    // Output to console
    console.log(digest);

    // TODO: Send to channel if configured
    // if (this.config.reporting.channel) {
    //   await this.sendToChannel(digest);
    // }

    return digest;
  }

  /**
   * Check discoveries for alerts
   */
  async checkAlerts(discoveries: Discovery[]): Promise<string[]> {
    const threshold = this.config.reporting.breakthrough_threshold;
    const alertMessages: string[] = [];

    for (const discovery of discoveries) {
      if (await this.alerts.shouldAlert(discovery, threshold)) {
        const message = this.alerts.formatAlert(discovery);
        console.log(message);
        await this.alerts.markAlerted(discovery.id);
        alertMessages.push(message);
      }
    }

    return alertMessages;
  }

  /**
   * Get summary stats
   */
  async getStats(): Promise<{
    totalDiscoveries: number;
    alertsSent: number;
  }> {
    const totalDiscoveries = await this.journal.count();
    const alertsSent = await this.alerts.getSentCount();

    return { totalDiscoveries, alertsSent };
  }
}
