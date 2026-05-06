import winston from 'winston';
export declare const requestLogger: winston.Logger;
export declare const errorLogger: winston.Logger;
export declare function logWebSocketEvent(event: string, playerId: string, gameId?: string, details?: Record<string, unknown>): void;
export declare function requestLogMiddleware(): express.RequestHandler;
import express from 'express';
//# sourceMappingURL=logger.d.ts.map