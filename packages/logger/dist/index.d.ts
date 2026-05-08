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
/**
 * Event types for categorized logging
 * @enum {string}
 */
export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';
/**
 * Creates a general event logger with daily rotation file transport.
 * Logs events to logs/events/events-%DATE%.log
 * In non-production environments, also outputs to console at debug level.
 *
 * @returns Winston logger instance configured for event logging
 */
declare function createEventLogger(): winston.Logger;
/** HTTP request logger - logs to logs/requests/request-%DATE%.log */
export declare const requestLogger: winston.Logger;
/** Error-only logger - logs to logs/errors/error-%DATE%.log */
export declare const errorLogger: winston.Logger;
/** General event logger - logs to logs/events/events-%DATE%.log */
export declare const globalEventLogger: winston.Logger;
/**
 * Logs a WebSocket event with player and optional game context.
 * Logs to both requestLogger and globalEventLogger.
 *
 * @param event - The WebSocket event name/type
 * @param playerId - The player ID associated with the event
 * @param gameId - Optional game ID associated with the event
 * @param details - Optional additional metadata to log
 */
export declare function logWebSocketEvent(event: string, playerId: string, gameId?: string, details?: Record<string, unknown>): void;
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
export declare function logHttpRequest(method: string, url: string, path: string, statusCode: number, duration: number, ip?: string, userAgent?: string, playerId?: string | null): void;
/**
 * Logs an error with optional stack trace and additional context.
 * Logs to both errorLogger and globalEventLogger.
 *
 * @param message - Error message to log
 * @param error - Optional Error object to extract message and stack trace from
 * @param context - Optional additional context metadata
 */
export declare function logError(message: string, error?: Error, context?: Record<string, unknown>): void;
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
export declare function logEvent(eventType: EventType, source: string, metadata?: Record<string, unknown>, playerId?: string, gameId?: string): void;
/**
 * Convenience function for logging game-related events.
 * Calls logEvent with eventType 'GAME' and source 'backend'.
 *
 * @param gameId - The game ID
 * @param action - The action being logged (e.g., 'move', 'chat')
 * @param playerId - The player ID associated with the action
 * @param metadata - Additional metadata to log
 */
export declare function logGameEvent(gameId: string, action: string, playerId: string, metadata?: Record<string, unknown>): void;
/**
 * Convenience function for logging system-related events.
 * Calls logEvent with eventType 'SYSTEM' and source 'backend'.
 *
 * @param message - The system message to log
 * @param metadata - Additional metadata to log
 */
export declare function logSystemEvent(message: string, metadata?: Record<string, unknown>): void;
export { createEventLogger };
//# sourceMappingURL=index.d.ts.map