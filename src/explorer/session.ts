/**
 * Exploration Session Manager - Manage session lifecycle
 */

import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type {
  Seed,
  Discovery,
  Thread,
  ExplorationSession,
  ExplorationStep,
  SessionStatus,
  CuriosityConfig,
} from "../types.js";
import { PathTracker } from "./path_tracker.js";

export class ExplorationSessionManager {
  private session: ExplorationSession;
  private pathTracker: PathTracker;
  private startTime: number = 0;

  constructor(seed: Seed, config: CuriosityConfig) {
    this.pathTracker = new PathTracker();

    this.session = {
      id: randomUUID(),
      seed_id: seed.id,
      started_at: "",
      ended_at: null,
      duration_limit_ms: config.exploration.max_depth * 60 * 1000, // Use depth as proxy for duration
      depth_limit: config.exploration.max_depth,
      current_depth: 0,
      path: [],
      discoveries: [],
      new_threads: [],
      status: "running" as SessionStatus,
    };
  }

  /**
   * Start the session
   */
  start(): void {
    this.session.started_at = new Date().toISOString();
    this.startTime = Date.now();
  }

  /**
   * Add a step to the exploration
   */
  addStep(step: ExplorationStep): void {
    this.pathTracker.addStep(step);
    this.session.current_depth = this.pathTracker.getDepth();
  }

  /**
   * Add a discovery to the session
   */
  addDiscovery(discovery: Discovery): void {
    this.session.discoveries.push(discovery);
  }

  /**
   * Add a thread to the session
   */
  addThread(thread: Thread): void {
    this.session.new_threads.push(thread);
  }

  /**
   * Check if session is still within limits
   */
  isWithinLimits(): boolean {
    // Check depth limit
    if (this.session.current_depth >= this.session.depth_limit) {
      return false;
    }

    // Check time limit
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.session.duration_limit_ms) {
      return false;
    }

    return true;
  }

  /**
   * Get elapsed time in ms
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get remaining time in ms
   */
  getRemainingMs(): number {
    const remaining = this.session.duration_limit_ms - this.getElapsedMs();
    return Math.max(0, remaining);
  }

  /**
   * Complete the session successfully
   */
  complete(): void {
    this.session.ended_at = new Date().toISOString();
    this.session.path = this.pathTracker.getPath();
    this.session.status = "completed" as SessionStatus;
  }

  /**
   * Mark session as timed out
   */
  timeout(): void {
    this.session.ended_at = new Date().toISOString();
    this.session.path = this.pathTracker.getPath();
    this.session.status = "timeout" as SessionStatus;
  }

  /**
   * Mark session as errored
   */
  error(_err: Error): void {
    this.session.ended_at = new Date().toISOString();
    this.session.path = this.pathTracker.getPath();
    this.session.status = "error" as SessionStatus;
  }

  /**
   * Get the session data
   */
  getSession(): ExplorationSession {
    return { ...this.session };
  }

  /**
   * Get the path tracker
   */
  getPathTracker(): PathTracker {
    return this.pathTracker;
  }

  /**
   * Get session ID
   */
  getId(): string {
    return this.session.id;
  }

  /**
   * Save session to disk
   */
  async save(dataDir: string): Promise<void> {
    const sessionsDir = join(dataDir, "sessions");
    if (!existsSync(sessionsDir)) {
      await mkdir(sessionsDir, { recursive: true });
    }

    const filePath = join(sessionsDir, `${this.session.id}.json`);
    await writeFile(filePath, JSON.stringify(this.session, null, 2));
  }
}
