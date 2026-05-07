import { requestLogger, errorLogger, globalEventLogger, logHttpRequest, logError, logEvent, logGameEvent, logSystemEvent } from '@chess/logger';
import type express from 'express';
export { requestLogger, errorLogger, globalEventLogger, logHttpRequest, logError, logEvent, logGameEvent, logSystemEvent, };
declare function logWebSocketEvent(event: string, playerId: string, gameId?: string, details?: Record<string, unknown>): void;
export { logWebSocketEvent };
export declare function requestLogMiddleware(): express.RequestHandler;
//# sourceMappingURL=logger.d.ts.map