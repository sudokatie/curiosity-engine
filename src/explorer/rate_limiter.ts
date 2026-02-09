/**
 * Rate Limiter - Per-domain request throttling
 */

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

/**
 * Rate limiter that enforces minimum delay between requests to the same domain
 */
export class RateLimiter {
  private lastRequestTime: Map<string, number> = new Map();
  private minDelayMs: number;

  constructor(minDelayMs: number = 1000) {
    this.minDelayMs = minDelayMs;
  }

  /**
   * Wait if needed before making a request to the given URL
   * Returns a promise that resolves when it's safe to proceed
   */
  async acquire(url: string): Promise<void> {
    const domain = extractDomain(url);
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(domain) ?? 0;
    const elapsed = now - lastTime;

    if (elapsed < this.minDelayMs) {
      const waitTime = this.minDelayMs - elapsed;
      await this.sleep(waitTime);
    }

    // Update last request time
    this.lastRequestTime.set(domain, Date.now());
  }

  /**
   * Check if we can make a request to this URL without waiting
   */
  canProceed(url: string): boolean {
    const domain = extractDomain(url);
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(domain) ?? 0;
    return now - lastTime >= this.minDelayMs;
  }

  /**
   * Get the wait time required before making a request to this URL
   */
  getWaitTime(url: string): number {
    const domain = extractDomain(url);
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(domain) ?? 0;
    const elapsed = now - lastTime;
    return Math.max(0, this.minDelayMs - elapsed);
  }

  /**
   * Clear rate limit data for a domain
   */
  clear(url: string): void {
    const domain = extractDomain(url);
    this.lastRequestTime.delete(domain);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.lastRequestTime.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a concurrency limiter that restricts the number of concurrent operations
 */
export function createConcurrencyLimiter(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if at capacity
    if (running >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    running++;
    try {
      return await fn();
    } finally {
      running--;
      // Release next waiting operation
      const next = queue.shift();
      if (next) next();
    }
  };
}
