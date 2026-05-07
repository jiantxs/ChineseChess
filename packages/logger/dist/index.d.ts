import winston from 'winston';
export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';
declare function createEventLogger(): winston.Logger;
export declare const requestLogger: winston.Logger;
export declare const errorLogger: winston.Logger;
export declare const globalEventLogger: winston.Logger;
export declare function logWebSocketEvent(event: string, playerId: string, gameId?: string, details?: Record<string, unknown>): void;
export declare function logHttpRequest(method: string, url: string, path: string, statusCode: number, duration: number, ip?: string, userAgent?: string, playerId?: string | null): void;
export declare function logError(message: string, error?: Error, context?: Record<string, unknown>): void;
export declare function logEvent(eventType: EventType, source: string, metadata?: Record<string, unknown>, playerId?: string, gameId?: string): void;
export declare function logGameEvent(gameId: string, action: string, playerId: string, metadata?: Record<string, unknown>): void;
export declare function logSystemEvent(message: string, metadata?: Record<string, unknown>): void;
export { createEventLogger };
//# sourceMappingURL=index.d.ts.map