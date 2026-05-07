import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { chessConfig } from '@chess/config';

export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';

const logDir = path.join(chessConfig.log.monorepoRoot, 'logs');

function createRequestLogger(): winston.Logger {
  return winston.createLogger({
    level: chessConfig.log.level,
    defaultMeta: { service: 'chess-server' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
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
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              }),
            ),
          })]
        : []),
    ],
  });
}

function createErrorLogger(): winston.Logger {
  return winston.createLogger({
    level: 'error',
    defaultMeta: { service: 'chess-server' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
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
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              }),
            ),
          })]
        : []),
    ],
  });
}

function createEventLogger(): winston.Logger {
  return winston.createLogger({
    level: chessConfig.log.level,
    defaultMeta: { service: 'chess-events' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
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
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
          })]
        : []),
    ],
  });
}

export const requestLogger = createRequestLogger();
export const errorLogger = createErrorLogger();
export const globalEventLogger = createEventLogger();

export function logWebSocketEvent(
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

export function logHttpRequest(
  method: string,
  url: string,
  path: string,
  statusCode: number,
  duration: number,
  ip?: string,
  userAgent?: string,
  playerId?: string | null
): void {
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

export function logError(
  message: string,
  error?: Error,
  context?: Record<string, unknown>
): void {
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

export function logEvent(
  eventType: EventType,
  source: string,
  metadata: Record<string, unknown> = {},
  playerId?: string,
  gameId?: string
): void {
  globalEventLogger.info('event', {
    timestamp: Date.now(),
    eventType,
    source,
    playerId: playerId || null,
    gameId: gameId || null,
    ...metadata,
  });
}

export function logGameEvent(
  gameId: string,
  action: string,
  playerId: string,
  metadata: Record<string, unknown> = {}
): void {
  logEvent('GAME', 'backend', { action, ...metadata }, playerId, gameId);
}

export function logSystemEvent(
  message: string,
  metadata: Record<string, unknown> = {}
): void {
  logEvent('SYSTEM', 'backend', { message, ...metadata });
}

export { createEventLogger };