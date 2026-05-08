/**
 * @chess/logger - Winston-based logging module
 *
 * Provides structured logging for requests, errors, and game events using Winston
 * with daily rotation file transport. Logs are stored in logs/{requests,errors,events}/
 *
 * Usage:
 *   import { requestLogger, errorLogger, globalEventLogger, logGameEvent } from '@chess/logger';
 *
 * Three main loggers:
 *   - requestLogger: HTTP request logs
 *   - errorLogger: Error-only logs
 *   - globalEventLogger: General event logs (all event types)
 *
 * @module @chess/logger
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { chessConfig } from '@chess/config';
const logDir = path.join(chessConfig.log.monorepoRoot, 'logs');
/**
 * Creates an HTTP request logger with daily rotation file transport.
 * Logs HTTP requests to logs/requests/request-%DATE%.log
 * In non-production environments, also outputs to console at debug level.
 *
 * @returns Winston logger instance configured for HTTP request logging
 */
function createRequestLogger() {
    return winston.createLogger({
        level: chessConfig.log.level,
        defaultMeta: { service: 'chess-server' },
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
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
                        format: winston.format.combine(winston.format.timestamp(), winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                            let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                            if (Object.keys(metadata).length > 0) {
                                msg += ` ${JSON.stringify(metadata)}`;
                            }
                            return msg;
                        })),
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
function createErrorLogger() {
    return winston.createLogger({
        level: 'error',
        defaultMeta: { service: 'chess-server' },
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
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
                        format: winston.format.combine(winston.format.timestamp(), winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                            let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                            if (Object.keys(metadata).length > 0) {
                                msg += ` ${JSON.stringify(metadata)}`;
                            }
                            return msg;
                        })),
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
function createEventLogger() {
    return winston.createLogger({
        level: chessConfig.log.level,
        defaultMeta: { service: 'chess-events' },
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
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
                        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
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
 * Logs a WebSocket event with player and optional game context.
 * Logs to both requestLogger and globalEventLogger.
 *
 * @param event - The WebSocket event name/type
 * @param playerId - The player ID associated with the event
 * @param gameId - Optional game ID associated with the event
 * @param details - Optional additional metadata to log
 */
export function logWebSocketEvent(event, playerId, gameId, details) {
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
export function logHttpRequest(method, url, path, statusCode, duration, ip, userAgent, playerId) {
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
export function logError(message, error, context) {
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
export function logEvent(eventType, source, metadata = {}, playerId, gameId) {
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
export function logGameEvent(gameId, action, playerId, metadata = {}) {
    logEvent('GAME', 'backend', { action, ...metadata }, playerId, gameId);
}
/**
 * Convenience function for logging system-related events.
 * Calls logEvent with eventType 'SYSTEM' and source 'backend'.
 *
 * @param message - The system message to log
 * @param metadata - Additional metadata to log
 */
export function logSystemEvent(message, metadata = {}) {
    logEvent('SYSTEM', 'backend', { message, ...metadata });
}
export { createEventLogger };
//# sourceMappingURL=index.js.map