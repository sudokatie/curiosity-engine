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

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string };
  payload: { kind: string; text: string };
}

interface CronListResponse {
  jobs: CronJob[];
}

/**
 * Register cron job with Clawdbot for scheduled explorations
 */
export async function registerCron(cronExpr: string = "0 3 * * *"): Promise<string | null> {
  const jobName = "curiosity-deep-dive";
  
  try {
    // Check if job already exists
    const listResponse = await fetch(`${CLAWDBOT_GATEWAY_URL}/api/cron?action=list`);
    if (!listResponse.ok) {
      throw new Error(`Failed to list cron jobs: ${listResponse.status}`);
    }
    
    const { jobs } = (await listResponse.json()) as CronListResponse;
    const existing = jobs.find((j) => j.name === jobName);
    
    if (existing) {
      console.log(`[INFO] Cron job '${jobName}' already exists (id: ${existing.id})`);
      return existing.id;
    }

    // Create new cron job
    const addResponse = await fetch(`${CLAWDBOT_GATEWAY_URL}/api/cron?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job: {
          name: jobName,
          enabled: true,
          schedule: { kind: "cron", expr: cronExpr },
          sessionTarget: "main",
          wakeMode: "next-heartbeat",
          payload: {
            kind: "systemEvent",
            text: `Curiosity Engine deep dive session.

Run a scheduled exploration:
1. Check for active seeds: curl -s http://localhost:3847/api/seeds?status=active
2. If seeds exist, start exploration: curl -X POST http://localhost:3847/api/explore
3. Wait for completion (check status at /api/explore/status)
4. Report any discoveries with significance > 0.7`,
          },
        },
      }),
    });

    if (!addResponse.ok) {
      throw new Error(`Failed to add cron job: ${addResponse.status}`);
    }

    const result = (await addResponse.json()) as { id: string };
    console.log(`[INFO] Created cron job '${jobName}' (id: ${result.id})`);
    return result.id;
  } catch (error) {
    console.error("[ERROR] Failed to register cron job:", error);
    return null;
  }
}

/**
 * Unregister cron job from Clawdbot
 */
export async function unregisterCron(): Promise<boolean> {
  const jobName = "curiosity-deep-dive";
  
  try {
    const listResponse = await fetch(`${CLAWDBOT_GATEWAY_URL}/api/cron?action=list`);
    if (!listResponse.ok) return false;
    
    const { jobs } = (await listResponse.json()) as CronListResponse;
    const existing = jobs.find((j) => j.name === jobName);
    
    if (!existing) {
      console.log(`[INFO] Cron job '${jobName}' not found`);
      return true;
    }

    const removeResponse = await fetch(
      `${CLAWDBOT_GATEWAY_URL}/api/cron?action=remove&id=${existing.id}`,
      { method: "DELETE" }
    );

    if (!removeResponse.ok) {
      throw new Error(`Failed to remove cron job: ${removeResponse.status}`);
    }

    console.log(`[INFO] Removed cron job '${jobName}'`);
    return true;
  } catch (error) {
    console.error("[ERROR] Failed to unregister cron job:", error);
    return false;
  }
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
