"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.requestLogger = void 0;
exports.logWebSocketEvent = logWebSocketEvent;
exports.requestLogMiddleware = requestLogMiddleware;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const config_1 = require("@chess/config");
const { combine, timestamp, json, printf } = winston_1.default.format;
// Ensure log directories exist
const logDir = path_1.default.resolve(process.cwd(), 'logs');
// Custom format for console output in development
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
// Request logger - records all HTTP requests and WebSocket events
exports.requestLogger = winston_1.default.createLogger({
    level: config_1.chessConfig.log.level,
    defaultMeta: { service: 'chess-server' },
    format: combine(timestamp(), json()),
    transports: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logDir, 'requests', 'request-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: config_1.chessConfig.log.maxFiles,
            format: combine(timestamp(), json()),
        }),
        ...(process.env.NODE_ENV !== 'production'
            ? [new winston_1.default.transports.Console({
                    level: 'debug',
                    format: combine(timestamp(), consoleFormat),
                })]
            : []),
    ],
});
// Error logger - records errors separately
exports.errorLogger = winston_1.default.createLogger({
    level: 'error',
    defaultMeta: { service: 'chess-server' },
    format: combine(timestamp(), json()),
    transports: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logDir, 'errors', 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: config_1.chessConfig.log.maxFiles,
            format: combine(timestamp(), json()),
        }),
        ...(process.env.NODE_ENV !== 'production'
            ? [new winston_1.default.transports.Console({
                    level: 'error',
                    format: combine(timestamp(), consoleFormat),
                })]
            : []),
    ],
});
// WebSocket event logger
function logWebSocketEvent(event, playerId, gameId, details) {
    exports.requestLogger.info('websocket_event', {
        event,
        playerId,
        gameId: gameId || null,
        ...details,
    });
}
// HTTP request logger middleware
function requestLogMiddleware() {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            exports.requestLogger.info('http_request', {
                method: req.method,
                url: req.url,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                ip: req.ip || req.socket.remoteAddress,
                userAgent: req.get('user-agent'),
                playerId: req.session?.playerId || null,
            });
        });
        next();
    };
}
//# sourceMappingURL=logger.js.map