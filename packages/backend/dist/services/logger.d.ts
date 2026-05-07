import { requestLogger, errorLogger, globalEventLogger, logHttpRequest, logError, logEvent, logGameEvent, logSystemEvent } from '@chess/logger';
export { requestLogger, errorLogger, globalEventLogger, logWebSocketEvent, logHttpRequest, logError, logEvent, logGameEvent, logSystemEvent, };
declare function logWebSocketEvent(event: string, playerId: string, gameId?: string, details?: Record<string, unknown>): void;
export declare function requestLogMiddleware(): express.RequestHandler;
import express from 'express';
//# sourceMappingURL=logger.d.ts.map