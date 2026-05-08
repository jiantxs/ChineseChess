/**
 * @fileoverview Winston logger re-exports and Express middleware
 * @module backend/src/services/logger
 *
 * Re-exports all loggers from @chess/logger package and provides
 * custom middleware and helper functions for logging HTTP requests
 * and WebSocket events.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import {
  requestLogger,
  errorLogger,
  globalEventLogger,
  logHttpRequest,
  logError,
  logEvent,
  logGameEvent,
  logSystemEvent,
} from '@chess/logger';
import type express from 'express';

/**
 * Winston logger for HTTP request logs
 * @remarks Writes to logs/requests/ directory via DailyRotateFile
 */
export { requestLogger };

/**
 * Winston logger for error logs
 * @remarks Writes to logs/errors/ directory via DailyRotateFile
 */
export { errorLogger };

/**
 * Winston logger for global events
 * @remarks Writes to logs/events/ directory, used for game and system events
 */
export { globalEventLogger };

/** @ignore Re-exported for convenience */
export { logHttpRequest, logError, logEvent, logGameEvent, logSystemEvent };

/**
 * Log a WebSocket event to both request and event loggers
 * @description Records WebSocket events (connection, message, disconnect, etc.)
 *              with player context and optional game ID to both the request logger
 *              and global event logger for comprehensive tracking.
 *
 * @param event - Event name/type (e.g., 'connection', 'message', 'disconnect')
 * @param playerId - UUID of the player associated with the event
 * @param gameId - Optional UUID of the game associated with the event
 * @param details - Optional additional event data to include in log
 *
 * @remarks
 * - Logs to requestLogger with 'websocket_event' prefix
 * - Logs to globalEventLogger with eventType: 'WEBSOCKET' and source: 'backend'
 * - gameId is set to null if not provided for consistent log structure
 *
 * @example
 * logWebSocketEvent('connection', playerId);
 * logWebSocketEvent('make_move', playerId, gameId, { moveNumber: 5, from: {row: 1, col: 1}, to: {row: 3, col: 1} });
 */
function logWebSocketEvent(
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

export { logWebSocketEvent };

/**
 * Express middleware to log HTTP requests
 * @description Creates middleware that logs all incoming HTTP requests including:
 *              method, URL, path, status code, response time, client IP,
 *              user agent, and player ID from session.
 *
 * @returns Express request handler middleware
 *
 * @remarks
 * - Measures request duration from receipt to response finish
 * - Retrieves playerId from express-session if available
 * - Logs via logHttpRequest which writes to request logger
 * - Non-blocking: logs on 'finish' event after response is sent
 *
 * @example
 * app.use(requestLogMiddleware());
 */
export function requestLogMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const playerId = (req.session as any)?.playerId || null;
      logHttpRequest(
        req.method,
        req.url,
        req.path,
        res.statusCode,
        duration,
        req.ip || req.socket.remoteAddress,
        req.get('user-agent'),
        playerId
      );
    });

    next();
  };
}