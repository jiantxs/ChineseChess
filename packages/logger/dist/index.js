import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { chessConfig } from '@chess/config';
const logDir = path.join(chessConfig.log.monorepoRoot, 'logs');
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
export const requestLogger = createRequestLogger();
export const errorLogger = createErrorLogger();
export const globalEventLogger = createEventLogger();
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
export function logGameEvent(gameId, action, playerId, metadata = {}) {
    logEvent('GAME', 'backend', { action, ...metadata }, playerId, gameId);
}
export function logSystemEvent(message, metadata = {}) {
    logEvent('SYSTEM', 'backend', { message, ...metadata });
}
export { createEventLogger };
//# sourceMappingURL=index.js.map