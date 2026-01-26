/**
 * Thread Decay - Age-based decay of old threads
 */

import type { ThreadPool } from "./thread_pool.js";
import type { ThreadStatus } from "../types.js";

/**
 * Decay threads older than the specified number of days
 * Returns the count of threads that were decayed
 */
export async function decayOldThreads(
  pool: ThreadPool,
  decayDays: number
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - decayDays);
  const cutoffTime = cutoffDate.getTime();

  const pending = await pool.list("pending" as ThreadStatus);
  let decayedCount = 0;

  for (const thread of pending) {
    const threadTime = new Date(thread.created_at).getTime();
    if (threadTime < cutoffTime) {
      await pool.update(thread.id, { status: "decayed" as ThreadStatus });
      decayedCount++;
    }
  }

  return decayedCount;
}

/**
 * Get threads that are close to decaying (within warning period)
 */
export async function getExpiringThreads(
  pool: ThreadPool,
  decayDays: number,
  warningDays: number = 2
): Promise<{ id: string; url: string; daysLeft: number }[]> {
  const now = new Date().getTime();
  const pending = await pool.list("pending" as ThreadStatus);
  const expiring: { id: string; url: string; daysLeft: number }[] = [];

  for (const thread of pending) {
    const threadTime = new Date(thread.created_at).getTime();
    const ageMs = now - threadTime;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const daysLeft = decayDays - ageDays;

    if (daysLeft <= warningDays && daysLeft > 0) {
      expiring.push({
        id: thread.id,
        url: thread.url,
        daysLeft: Math.floor(daysLeft),
      });
    }
  }

  return expiring;
}
