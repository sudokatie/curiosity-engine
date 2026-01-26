/**
 * Logger - Simple logging utility
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

/**
 * Set the log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Format a log message
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${levelStr}] ${timestamp} ${message}`;
}

/**
 * Check if a level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

/**
 * Log a debug message
 */
export function debug(message: string): void {
  if (shouldLog("debug")) {
    console.log(formatMessage("debug", message));
  }
}

/**
 * Log an info message
 */
export function info(message: string): void {
  if (shouldLog("info")) {
    console.log(formatMessage("info", message));
  }
}

/**
 * Log a warning message
 */
export function warn(message: string): void {
  if (shouldLog("warn")) {
    console.warn(formatMessage("warn", message));
  }
}

/**
 * Log an error message
 */
export function error(message: string): void {
  if (shouldLog("error")) {
    console.error(formatMessage("error", message));
  }
}

/**
 * Create a logger instance with a prefix
 */
export function createLogger(prefix: string) {
  return {
    debug: (msg: string) => debug(`[${prefix}] ${msg}`),
    info: (msg: string) => info(`[${prefix}] ${msg}`),
    warn: (msg: string) => warn(`[${prefix}] ${msg}`),
    error: (msg: string) => error(`[${prefix}] ${msg}`),
  };
}
