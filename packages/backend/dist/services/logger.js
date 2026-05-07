"use strict";
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