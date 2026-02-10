/**
 * Reporter - Surface discoveries to user
 */

import type { Discovery, CuriosityConfig } from "../types.js";
import type { Journal } from "../journal/journal.js";
import { generateDigest } from "./digest.js";
import { AlertManager } from "./alerts.js";
import { sendMessage, sendDiscoveryAlert } from "../scheduler/clawdbot.js";

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

    // Send to channel if configured
    if (this.config.reporting.channel) {
      try {
        await sendMessage(digest, this.config.reporting.channel);
        console.log(`[INFO] Digest sent to channel: ${this.config.reporting.channel}`);
      } catch (error) {
        console.error(`[WARN] Failed to send digest to channel: ${error}`);
      }
    }

    return digest;
  }

  /**
   * Check discoveries for alerts
   */
  async checkAlerts(discoveries: Discovery[]): Promise<string[]> {
    const threshold = this.config.reporting.breakthrough_threshold;
    const alertMessages: string[] = [];
    const channel = this.config.reporting.channel;

    for (const discovery of discoveries) {
      if (await this.alerts.shouldAlert(discovery, threshold)) {
        const message = this.alerts.formatAlert(discovery);
        console.log(message);
        await this.alerts.markAlerted(discovery.id);
        alertMessages.push(message);

        // Send to channel if configured
        if (channel && this.config.reporting.breakthrough_alerts) {
          try {
            await sendDiscoveryAlert(
              discovery.title,
              discovery.significance,
              undefined,
              channel
            );
          } catch (error) {
            console.error(`[WARN] Failed to send alert to channel: ${error}`);
          }
        }
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
