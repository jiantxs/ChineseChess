/**
 * @fileoverview Winston-based logging module for the Chinese Chess application.
 *
 * Provides structured logging for requests, errors, game events, and system events
 * using Winston with daily rotation file transport. Logs are stored in:
 *   - logs/requests/   (HTTP request logs)
 *   - logs/errors/     (Error logs)
 *   - logs/events/     (General event logs)
 *   - logs/games/      (Game-specific event logs per gameId)
 *
 * Usage:
 *   import { requestLogger, errorLogger, globalEventLogger, logGameEvent, gameLogger } from '@chess/logger';
 *
 * @module @chess/logger
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { chessConfig } from '@chess/config';

const logDir = path.join(chessConfig.log.monorepoRoot, 'logs');

// Ensure game log directory exists
const gameLogDir = path.join(logDir, 'games');
if (!fs.existsSync(gameLogDir)) {
  fs.mkdirSync(gameLogDir, { recursive: true });
}

/**
 * Event types for categorized logging
 * @enum {string}
 */
export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';

/**
 * Creates an HTTP request logger with daily rotation file transport.
 * Logs HTTP requests to logs/requests/request-%DATE%.log
 * In non-production environments, also outputs to console at debug level.
 *
 * @returns Winston logger instance configured for HTTP request logging
 */
function createRequestLogger(): winston.Logger {
  return winston.createLogger({
    level: chessConfig.log.level,
    defaultMeta: { service: 'chess-server' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        filename: path.join(logDir, 'requests', 'request-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: chessConfig.log.maxFiles,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      ...(process.env.NODE_ENV !== 'production'
        ? [new winston.transports.Console({
            level: 'debug',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              }),
            ),
          })]
        : []),
    ],
  });
}

/**
 * Creates an error-only logger with daily rotation file transport.
 * Logs errors to logs/errors/error-%DATE%.log
 * In non-production environments, also outputs to console at error level.
 *
 * @returns Winston logger instance configured for error logging
 */
function createErrorLogger(): winston.Logger {
  return winston.createLogger({
    level: 'error',
    defaultMeta: { service: 'chess-server' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        filename: path.join(logDir, 'errors', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: chessConfig.log.maxFiles,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      ...(process.env.NODE_ENV !== 'production'
        ? [new winston.transports.Console({
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              }),
            ),
          })]
        : []),
    ],
  });
}

/**
 * Creates a general event logger with daily rotation file transport.
 * Logs events to logs/events/events-%DATE%.log
 * In non-production environments, also outputs to console at debug level.
 *
 * @returns Winston logger instance configured for event logging
 */
function createEventLogger(): winston.Logger {
  return winston.createLogger({
    level: chessConfig.log.level,
    defaultMeta: { service: 'chess-events' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        filename: path.join(logDir, 'events', 'events-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: chessConfig.log.maxFiles,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      ...(process.env.NODE_ENV !== 'production'
        ? [new winston.transports.Console({
            level: 'debug',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
          })]
        : []),
    ],
  });
}

// Exported loggers - initialized at module load time

/** HTTP request logger - logs to logs/requests/request-%DATE%.log */
export const requestLogger = createRequestLogger();
/** Error-only logger - logs to logs/errors/error-%DATE%.log */
export const errorLogger = createErrorLogger();
/** General event logger - logs to logs/events/events-%DATE%.log */
export const globalEventLogger = createEventLogger();

/**
 * Game ID keyed logger factory
 * Creates Winston loggers that write game-specific logs to logs/games/<gameId>/%DATE%.log
 * Each game gets its own log file within its gameId subdirectory.
 *
 * @param gameId - The unique game identifier
 * @returns Winston logger instance for the specified game
 */
function createGameLogger(gameId: string): winston.Logger {
  const gameLogSubdir = path.join(gameLogDir, gameId);

  return winston.createLogger({
    level: chessConfig.log.level,
    defaultMeta: { service: 'chess-game', gameId },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        filename: path.join(gameLogSubdir, '%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: chessConfig.log.maxFiles,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      ...(process.env.NODE_ENV !== 'production'
        ? [new winston.transports.Console({
            level: 'debug',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              }),
            ),
          })]
        : []),
    ],
  });
}

// In-memory store for game loggers - prevents recreating loggers for the same game
const gameLoggers: Map<string, winston.Logger> = new Map();

/**
 * Gets or creates a game-specific logger for the given gameId.
 * Loggers are cached so repeated calls with the same gameId return the same logger instance.
 *
 * @param gameId - The unique game identifier
 * @returns Winston logger instance configured for the specified game
 */
export function getGameLogger(gameId: string): winston.Logger {
  let logger = gameLoggers.get(gameId);
  if (!logger) {
    logger = createGameLogger(gameId);
    gameLoggers.set(gameId, logger);
  }
  return logger;
}

/**
 * Logs a game lifecycle event with detailed metadata.
 * Writes to both:
 *   - The game's specific log file (logs/games/<gameId>/<date>.log)
 *   - The global event log (logs/events/events-<date>.log)
 *
 * This is called from @chess/core when game state changes (created, move, finished, aborted).
 *
 * @param gameId - The game identifier
 * @param action - The action being logged ('created' | 'move' | 'finished' | 'aborted')
 * @param metadata - Additional event-specific metadata
 */
export function logGameLifecycle(
  gameId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): void {
  const gameLogger = getGameLogger(gameId);

  const eventData = {
    action,
    gameId,
    timestamp: Date.now(),
    ...metadata,
  };

  // Write to game's dedicated log file
  switch (action) {
    case 'created':
      gameLogger.info('game_created', eventData);
      break;
    case 'move':
      gameLogger.info('game_move', eventData);
      break;
    case 'finished':
      gameLogger.info('game_finished', eventData);
      break;
    case 'aborted':
      gameLogger.warn('game_aborted', eventData);
      break;
    default:
      gameLogger.info('game_event', eventData);
  }

  // Also write to global event log for cross-game monitoring
  globalEventLogger.info('game_event', {
    eventType: 'GAME',
    source: 'core',
    gameId,
    action,
    ...metadata,
  });
}

/**
 * Clears the internal game logger cache.
 * Call this during shutdown or when games are fully cleaned up to prevent memory leaks.
 *
 * @param gameId - Optional specific game ID to clear. If omitted, clears all game loggers.
 */
export function clearGameLogger(gameId?: string): void {
  if (gameId) {
    gameLoggers.delete(gameId);
  } else {
    gameLoggers.clear();
  }
}

/**
 * Logs a WebSocket event with player and optional game context.
 * Logs to both requestLogger and globalEventLogger.
 *
 * @param event - The WebSocket event name/type
 * @param playerId - The player ID associated with the event
 * @param gameId - Optional game ID associated with the event
 * @param details - Optional additional metadata to log
 */
export function logWebSocketEvent(
  event: string,
  playerId: string,
  gameId?: string,
  details?: Record<string, unknown>
): void {
  requestLogger.info('websocket_event', {
    event,
    playerId,
    gameId: gameId || null,
    ...details,
  });
  globalEventLogger.info('event', {
    eventType: 'WEBSOCKET',
    source: 'backend',
    playerId,
    gameId: gameId || null,
    ...details,
  });
}

/**
 * Logs an HTTP request with method, URL, status code, and duration.
 * Logs to both requestLogger and globalEventLogger.
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Full URL of the request
 * @param path - Request path
 * @param statusCode - HTTP status code
 * @param duration - Request duration in milliseconds
 * @param ip - Optional client IP address
 * @param userAgent - Optional user agent string
 * @param playerId - Optional player ID associated with the request
 */
export function logHttpRequest(
  method: string,
  url: string,
  path: string,
  statusCode: number,
  duration: number,
  ip?: string,
  userAgent?: string,
  playerId?: string | null
): void {
  requestLogger.info('http_request', {
    method,
    url,
    path,
    statusCode,
    duration,
    ip,
    userAgent,
    playerId,
  });
  globalEventLogger.info('event', {
    eventType: 'HTTP',
    source: 'backend',
    playerId: playerId || null,
    method,
    path,
    statusCode,
    duration,
  });
}

/**
 * Logs an error with optional stack trace and additional context.
 * Logs to both errorLogger and globalEventLogger.
 *
 * @param message - Error message to log
 * @param error - Optional Error object to extract message and stack trace from
 * @param context - Optional additional context metadata
 */
export function logError(
  message: string,
  error?: Error,
  context?: Record<string, unknown>
): void {
  errorLogger.error(message, {
    error: error?.message || error?.toString(),
    stack: error?.stack,
    ...context,
  });
  globalEventLogger.error('event', {
    eventType: 'ERROR',
    source: 'backend',
    message,
    error: error?.message || error?.toString(),
    ...context,
  });
}

/**
 * Generic event logger with eventType, source, and metadata.
 * Logs to globalEventLogger with eventType categorization.
 *
 * @param eventType - The type of event (GAME, HTTP, WEBSOCKET, SYSTEM, ERROR)
 * @param source - The source of the event (e.g., 'backend')
 * @param metadata - Additional metadata to log
 * @param playerId - Optional player ID
 * @param gameId - Optional game ID
 */
export function logEvent(
  eventType: EventType,
  source: string,
  metadata: Record<string, unknown> = {},
  playerId?: string,
  gameId?: string
): void {
  globalEventLogger.info('event', {
    timestamp: Date.now(),
    eventType,
    source,
    playerId: playerId || null,
    gameId: gameId || null,
    ...metadata,
  });
}

/**
 * Convenience function for logging game-related events.
 * Calls logEvent with eventType 'GAME' and source 'backend'.
 *
 * @param gameId - The game ID
 * @param action - The action being logged (e.g., 'move', 'chat')
 * @param playerId - The player ID associated with the action
 * @param metadata - Additional metadata to log
 */
export function logGameEvent(
  gameId: string,
  action: string,
  playerId: string,
  metadata: Record<string, unknown> = {}
): void {
  logEvent('GAME', 'backend', { action, ...metadata }, playerId, gameId);
}

/**
 * Convenience function for logging system-related events.
 * Calls logEvent with eventType 'SYSTEM' and source 'backend'.
 *
 * @param message - The system message to log
 * @param metadata - Additional metadata to log
 */
export function logSystemEvent(
  message: string,
  metadata: Record<string, unknown> = {}
): void {
  logEvent('SYSTEM', 'backend', { message, ...metadata });
}

export { createEventLogger };