/**
 * Clawdbot Integration - Hooks for heartbeat and cron
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Clawdbot gateway endpoint
const CLAWDBOT_GATEWAY_URL = "http://localhost:18789";

// Path to Clawdbot HEARTBEAT.md
const HEARTBEAT_PATH = join(homedir(), "clawd", "HEARTBEAT.md");

/**
 * Register with Clawdbot heartbeat system by writing to HEARTBEAT.md
 */
export async function registerHeartbeat(): Promise<void> {
  const heartbeatTask = `
## Curiosity Engine Check
- Run curiosity exploration if it's been more than 6 hours since last exploration
- Check for pending seeds: \`curl -s http://localhost:3847/api/seeds?status=active | jq length\`
- If there are active seeds, trigger exploration: \`curl -X POST http://localhost:3847/api/explore\`
- Report any high-significance discoveries (>0.8) found
`;

  try {
    let content = "";
    if (existsSync(HEARTBEAT_PATH)) {
      content = await readFile(HEARTBEAT_PATH, "utf-8");
    }

    // Check if curiosity task already exists
    if (content.includes("## Curiosity Engine Check")) {
      console.log("[INFO] Heartbeat task already registered");
      return;
    }

    // Append task to HEARTBEAT.md
    const newContent = content.trim() + "\n" + heartbeatTask;
    await writeFile(HEARTBEAT_PATH, newContent);
    console.log("[INFO] Registered curiosity exploration with Clawdbot heartbeat");
  } catch (error) {
    console.error("[ERROR] Failed to register heartbeat:", error);
    throw error;
  }
}

/**
 * Remove curiosity task from HEARTBEAT.md
 */
export async function unregisterHeartbeat(): Promise<void> {
  try {
    if (!existsSync(HEARTBEAT_PATH)) {
      return;
    }

    const content = await readFile(HEARTBEAT_PATH, "utf-8");
    
    // Remove the curiosity engine section
    const lines = content.split("\n");
    const filteredLines: string[] = [];
    let inCuriositySection = false;

    for (const line of lines) {
      if (line.startsWith("## Curiosity Engine Check")) {
        inCuriositySection = true;
        continue;
      }
      if (inCuriositySection && line.startsWith("## ")) {
        inCuriositySection = false;
      }
      if (!inCuriositySection) {
        filteredLines.push(line);
      }
    }

    await writeFile(HEARTBEAT_PATH, filteredLines.join("\n").trim() + "\n");
    console.log("[INFO] Unregistered curiosity exploration from Clawdbot heartbeat");
  } catch (error) {
    console.error("[ERROR] Failed to unregister heartbeat:", error);
  }
}

/**
 * Register cron job with Clawdbot
 */
export async function registerCron(): Promise<void> {
  // TODO: Integrate with Clawdbot cron
  // This would use the cron tool to schedule deep dives
  console.log("[INFO] Clawdbot cron integration not yet implemented");
}

/**
 * Send message via Clawdbot gateway
 */
export async function sendMessage(
  message: string,
  channel?: string
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      action: "send",
      message,
    };

    if (channel) {
      payload.target = channel;
    }

    const response = await fetch(`${CLAWDBOT_GATEWAY_URL}/api/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
    }

    console.log("[INFO] Message sent via Clawdbot");
  } catch (error) {
    console.error("[ERROR] Failed to send message via Clawdbot:", error);
    throw error;
  }
}

/**
 * Send a discovery alert via Clawdbot
 */
export async function sendDiscoveryAlert(
  title: string,
  significance: number,
  url?: string,
  channel?: string
): Promise<void> {
  const stars = "⭐".repeat(Math.ceil(significance * 5));
  let message = `🔍 **New Discovery** ${stars}\n\n**${title}**\nSignificance: ${(significance * 100).toFixed(0)}%`;
  
  if (url) {
    message += `\n\n${url}`;
  }

  await sendMessage(message, channel);
}
