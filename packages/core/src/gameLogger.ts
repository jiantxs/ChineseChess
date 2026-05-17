/**
 * In-memory game event logger for Chinese Chess
 *
 * Usage: Log game events for replay and debugging
 * Supports log levels: DEBUG, INFO, WARN, ERROR
 * Exports singleton `gameLogger` instance
 *
 * @module GameLogger
 * @fileoverview In-memory game event logger for Chinese Chess
 */

/**
 * Log level enumeration
 * @enum {number}
 */
export enum LogLevel {
  /** Detailed debugging information */
  DEBUG = 0,
  /** General informational messages */
  INFO = 1,
  /** Warning messages for potential issues */
  WARN = 2,
  /** Error messages for failures */
  ERROR = 3,
}

/**
 * Represents a single log entry
 */
export interface LogEntry {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Log level of this entry */
  level: LogLevel;
  /** Log message text */
  message: string;
  /** Optional additional structured data */
  data?: Record<string, unknown>;
}

/**
 * External logger interface for bridging to Winston/file logging.
 * When set, game events will also be forwarded to this external logger.
 */
export interface ExternalGameLogger {
  (gameId: string, action: string, metadata: Record<string, unknown>): void;
}

/**
 * In-memory event logger with level filtering
 *
 * Stores log entries in memory and supports filtering by game ID
 * for game replay functionality.
 *
 * Optionally forwards logs to an external logger (e.g., Winston-based)
 * via setExternalLogger() for file persistence.
 */
export class GameLogger {
  private logs: LogEntry[] = [];
  private minLevel: LogLevel;
  private externalLogger: ExternalGameLogger | null = null;

  /**
   * Creates a new GameLogger instance
   * @param minLevel - Minimum log level to record (default: INFO)
   */
  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  /**
   * Sets an external logger to receive game events for file persistence.
   * This allows @chess/core to forward events to @chess/logger without
   * creating a circular dependency.
   *
   * @param logger - External logger function (gameId, action, metadata)
   */
  setExternalLogger(logger: ExternalGameLogger | null): void {
    this.externalLogger = logger;
  }

  /**
   * Internal logging method
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional additional data
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Forward to external logger if set (for file persistence via Winston)
    if (this.externalLogger && data?.gameId) {
      this.externalLogger(data.gameId as string, message, data);
    }
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param data - Optional additional data
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Logs an informational message
   * @param message - Info message
   * @param data - Optional additional data
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param data - Optional additional data
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Logs an error message
   * @param message - Error message
   * @param data - Optional additional data
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Returns all log entries
   * @returns Array of all log entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Filters logs by game ID for replay
   * @param gameId - The game ID to filter by
   * @returns Array of log entries related to the specified game
   */
  getGameReplay(gameId: string): LogEntry[] {
    return this.logs.filter(
      log => log.data?.gameId === gameId || log.message.includes(gameId)
    );
  }

  /**
   * Clears all log entries
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Exports all logs as formatted JSON string
   * @returns JSON string of all log entries
   */
  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * Singleton instance of GameLogger for global use
 */
export const gameLogger = new GameLogger();
