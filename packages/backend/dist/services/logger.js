"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSystemEvent = exports.logGameEvent = exports.logEvent = exports.logError = exports.logHttpRequest = exports.globalEventLogger = exports.errorLogger = exports.requestLogger = void 0;
exports.logWebSocketEvent = logWebSocketEvent;
exports.requestLogMiddleware = requestLogMiddleware;
const logger_1 = require("@chess/logger");
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return logger_1.requestLogger; } });
Object.defineProperty(exports, "errorLogger", { enumerable: true, get: function () { return logger_1.errorLogger; } });
Object.defineProperty(exports, "globalEventLogger", { enumerable: true, get: function () { return logger_1.globalEventLogger; } });
Object.defineProperty(exports, "logHttpRequest", { enumerable: true, get: function () { return logger_1.logHttpRequest; } });
Object.defineProperty(exports, "logError", { enumerable: true, get: function () { return logger_1.logError; } });
Object.defineProperty(exports, "logEvent", { enumerable: true, get: function () { return logger_1.logEvent; } });
Object.defineProperty(exports, "logGameEvent", { enumerable: true, get: function () { return logger_1.logGameEvent; } });
Object.defineProperty(exports, "logSystemEvent", { enumerable: true, get: function () { return logger_1.logSystemEvent; } });
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
function logWebSocketEvent(event, playerId, gameId, details) {
    logger_1.requestLogger.info('websocket_event', {
        event,
        playerId,
        gameId: gameId || null,
        ...details,
    });
    logger_1.globalEventLogger.info('event', {
        eventType: 'WEBSOCKET',
        source: 'backend',
        playerId,
        gameId: gameId || null,
        ...details,
    });
}
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
function requestLogMiddleware() {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            const playerId = req.session?.playerId || null;
            (0, logger_1.logHttpRequest)(req.method, req.url, req.path, res.statusCode, duration, req.ip || req.socket.remoteAddress, req.get('user-agent'), playerId);
        });
        next();
    };
}
//# sourceMappingURL=logger.js.map