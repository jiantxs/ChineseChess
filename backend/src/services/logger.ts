import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { chessConfig } from '../../../chess.config';

const { combine, timestamp, json, printf } = winston.format;

// Ensure log directories exist
const logDir = path.resolve(process.cwd(), 'logs');

// Custom format for console output in development
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Request logger - records all HTTP requests and WebSocket events
export const requestLogger = winston.createLogger({
  level: chessConfig.log.level,
  defaultMeta: { service: 'chess-server' },
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'requests', 'request-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: chessConfig.log.maxFiles,
      format: combine(timestamp(), json()),
    }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({
          level: 'debug',
          format: combine(timestamp(), consoleFormat),
        })]
      : []),
  ],
});

// Error logger - records errors separately
export const errorLogger = winston.createLogger({
  level: 'error',
  defaultMeta: { service: 'chess-server' },
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'errors', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: chessConfig.log.maxFiles,
      format: combine(timestamp(), json()),
    }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({
          level: 'error',
          format: combine(timestamp(), consoleFormat),
        })]
      : []),
  ],
});

// WebSocket event logger
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
}

// HTTP request logger middleware
export function requestLogMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      requestLogger.info('http_request', {
        method: req.method,
        url: req.url,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        playerId: (req.session as any)?.playerId || null,
      });
    });
    
    next();
  };
}

import express from 'express';
