/**
 * @fileoverview 基于 Winston 的中国象棋应用程序日志模块。
 *
 * 使用 Winston 和每日轮转文件传输提供结构化日志记录，用于：
 *   - logs/requests/   (HTTP 请求日志)
 *   - logs/errors/     (错误日志)
 *   - logs/events/     (通用事件日志)
 *   - logs/games/      (按 gameId 分组的游戏特定事件日志)
 *
 * 多实例模式：每次 createLogger() 调用创建独立的日志实例。
 * 每个实例拥有独立的配置、日志文件目录和日志记录器。
 *
 * @module @chess/logger
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import type { ChessConfig } from '@chess/config';

/**
 * 分类日志的事件类型
 * @enum {string}
 */
export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';

/**
 * 日志实例接口 - 提供创建独立日志实例的工厂方法
 */
export interface LoggerInstance {
  requestLogger: winston.Logger;
  errorLogger: winston.Logger;
  globalEventLogger: winston.Logger;
  getGameLogger: (gameId: string) => winston.Logger;
  clearGameLogger: (gameId?: string) => void;
  logGameLifecycle: (gameId: string, action: string, metadata?: Record<string, unknown>) => void;
  logWebSocketEvent: (event: string, playerId: string, gameId?: string, details?: Record<string, unknown>) => void;
  logHttpRequest: (method: string, url: string, path: string, statusCode: number, duration: number, ip?: string, userAgent?: string, playerId?: string | null) => void;
  logError: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  logEvent: (eventType: EventType, source: string, metadata?: Record<string, unknown>, playerId?: string, gameId?: string) => void;
  logGameEvent: (gameId: string, action: string, playerId: string, metadata?: Record<string, unknown>) => void;
  logSystemEvent: (message: string, metadata?: Record<string, unknown>) => void;
  logClientLogEvent: (level: string, message: string, timestamp: number, metadata?: Record<string, unknown>, playerId?: string, gameId?: string) => void;
}

/**
 * 日志器工厂类 - 创建独立的日志实例
 *
 * 每个创建的实例拥有独立的：
 * - 配置副本
 * - 日志文件目录
 * - 日志记录器实例
 * - 游戏日志缓存
 *
 * @example
 * // 创建主服务器日志实例
 * const mainLogger = new LoggerFactory().createLogger(mainConfig);
 *
 * // 创建移动服务器日志实例
 * const mobileLogger = new LoggerFactory().createLogger(mobileConfig);
 *
 * // 两个实例独立运行，互不干扰
 * mainLogger.logSystemEvent('Main server started');
 * mobileLogger.logSystemEvent('Mobile server started');
 */
export class LoggerFactory {
  /**
   * 创建日志实例
   * @param config - ChessConfig 实例
   * @returns 日志实例接口
   */
  public createLogger(config: ChessConfig): LoggerInstance {
    const gameLogDir = path.join(config.log.monorepoRoot, 'logs', 'games');
    if (!fs.existsSync(gameLogDir)) {
      fs.mkdirSync(gameLogDir, { recursive: true });
    }

    const gameLoggers: Map<string, winston.Logger> = new Map();

    const getLogDir = () => path.join(config.log.monorepoRoot, 'logs');

    const createRequestLogger = (): winston.Logger => {
      return winston.createLogger({
        level: config.log.level,
        defaultMeta: { service: 'chess-server' },
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new DailyRotateFile({
            filename: path.join(getLogDir(), 'requests', 'request-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: config.log.maxFiles,
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
    };

    const createErrorLogger = (): winston.Logger => {
      return winston.createLogger({
        level: 'error',
        defaultMeta: { service: 'chess-server' },
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new DailyRotateFile({
            filename: path.join(getLogDir(), 'errors', 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: config.log.maxFiles,
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
    };

    const createEventLogger = (): winston.Logger => {
      return winston.createLogger({
        level: config.log.level,
        defaultMeta: { service: 'chess-events' },
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new DailyRotateFile({
            filename: path.join(getLogDir(), 'events', 'events-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: config.log.maxFiles,
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
    };

    const createGameLogger = (gameId: string): winston.Logger => {
      const gameLogSubdir = path.join(getLogDir(), 'games', gameId);

      return winston.createLogger({
        level: config.log.level,
        defaultMeta: { service: 'chess-game', gameId },
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new DailyRotateFile({
            filename: path.join(gameLogSubdir, '%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: config.log.maxFiles,
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
    };

    const getGameLoggerInternal = (gameId: string): winston.Logger => {
      let logger = gameLoggers.get(gameId);
      if (!logger) {
        logger = createGameLogger(gameId);
        gameLoggers.set(gameId, logger);
      }
      return logger;
    };

    const clearGameLoggerInternal = (gameId?: string): void => {
      if (gameId) {
        gameLoggers.delete(gameId);
      } else {
        gameLoggers.clear();
      }
    };

    const logGameLifecycleInternal = (
      gameId: string,
      action: string,
      metadata: Record<string, unknown> = {}
    ): void => {
      const gameLogger = getGameLoggerInternal(gameId);

      const eventData = {
        action,
        gameId,
        timestamp: Date.now(),
        ...metadata,
      };

      switch (action) {
        case 'created':
          gameLogger.info('game_created', eventData);
          break;
        case 'move':
          gameLogger.info('game_move', eventData);
          break;
        case 'finished':
          gameLogger.info('game_finished', eventData);
          break;
        case 'aborted':
          gameLogger.warn('game_aborted', eventData);
          break;
        default:
          gameLogger.info('game_event', eventData);
      }

      const globalEventLogger = createEventLogger();
      globalEventLogger.info('game_event', {
        eventType: 'GAME',
        source: 'core',
        gameId,
        action,
        ...metadata,
      });
    };

    const logWebSocketEventInternal = (
      event: string,
      playerId: string,
      gameId: string | undefined,
      details: Record<string, unknown> | undefined
    ): void => {
      const requestLogger = createRequestLogger();
      const globalEventLogger = createEventLogger();

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
    };

    const logHttpRequestInternal = (
      method: string,
      url: string,
      p: string,
      statusCode: number,
      duration: number,
      ip: string | undefined,
      userAgent: string | undefined,
      playerId: string | null | undefined
    ): void => {
      const requestLogger = createRequestLogger();
      const globalEventLogger = createEventLogger();

      requestLogger.info('http_request', {
        method,
        url,
        path: p,
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
        path: p,
        statusCode,
        duration,
      });
    };

    const logErrorInternal = (
      message: string,
      error: Error | undefined,
      context: Record<string, unknown> | undefined
    ): void => {
      const errorLogger = createErrorLogger();
      const globalEventLogger = createEventLogger();

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
    };

    const logEventInternal = (
      eventType: EventType,
      source: string,
      metadata: Record<string, unknown> = {},
      playerId: string | undefined,
      gameId: string | undefined
    ): void => {
      const globalEventLogger = createEventLogger();
      globalEventLogger.info('event', {
        timestamp: Date.now(),
        eventType,
        source,
        playerId: playerId || null,
        gameId: gameId || null,
        ...metadata,
      });
    };

    const logGameEventInternal = (
      gameId: string,
      action: string,
      playerId: string,
      metadata: Record<string, unknown> | undefined
    ): void => {
      logEventInternal('GAME', 'backend', { action, ...metadata }, playerId, gameId);
    };

    const logSystemEventInternal = (
      message: string,
      metadata: Record<string, unknown> | undefined
    ): void => {
      logEventInternal('SYSTEM', 'backend', { message, ...metadata }, undefined, undefined);
    };

    const logClientLogEventInternal = (
      level: string,
      message: string,
      timestamp: number,
      metadata: Record<string, unknown> | undefined,
      playerId: string | undefined,
      gameId: string | undefined
    ): void => {
      const globalEventLogger = createEventLogger();
      const errorLogger = createErrorLogger();

      const logData = {
        eventType: 'CLIENT',
        source: 'frontend',
        clientTimestamp: timestamp,
        level,
        message,
        playerId: playerId || null,
        gameId: gameId || null,
        ...metadata,
      };

      switch (level) {
        case 'error':
          globalEventLogger.error('client_log', logData);
          errorLogger.error('client_log', logData);
          break;
        case 'warn':
          globalEventLogger.warn('client_log', logData);
          break;
        case 'debug':
          globalEventLogger.debug('client_log', logData);
          break;
        default:
          globalEventLogger.info('client_log', logData);
      }
    };

    return {
      requestLogger: createRequestLogger(),
      errorLogger: createErrorLogger(),
      globalEventLogger: createEventLogger(),
      getGameLogger: getGameLoggerInternal,
      clearGameLogger: clearGameLoggerInternal,
      logGameLifecycle: logGameLifecycleInternal,
      logWebSocketEvent: logWebSocketEventInternal,
      logHttpRequest: logHttpRequestInternal,
      logError: logErrorInternal,
      logEvent: logEventInternal,
      logGameEvent: logGameEventInternal,
      logSystemEvent: logSystemEventInternal,
      logClientLogEvent: logClientLogEventInternal,
    };
  }
}