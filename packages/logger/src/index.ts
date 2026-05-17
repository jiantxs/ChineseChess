/**
 * @fileoverview 基于 Winston 的中国象棋应用程序日志模块。
 *
 * 使用 Winston 和每日轮转文件传输提供结构化日志记录，用于：
 *   - logs/requests/   (HTTP 请求日志)
 *   - logs/errors/     (错误日志)
 *   - logs/events/     (通用事件日志)
 *   - logs/games/      (按 gameId 分组的游戏特定事件日志)
 *
 * 使用方法：
 *   import { requestLogger, errorLogger, globalEventLogger, logGameEvent, gameLogger } from '@chess/logger';
 *
 * @module @chess/logger
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { chessConfig } from '@chess/config';

const logDir = path.join(chessConfig.log.monorepoRoot, 'logs');

// 确保游戏日志目录存在
const gameLogDir = path.join(logDir, 'games');
if (!fs.existsSync(gameLogDir)) {
  fs.mkdirSync(gameLogDir, { recursive: true });
}

/**
 * 分类日志的事件类型
 * @enum {string}
 */
export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';

/**
 * 创建 HTTP 请求日志记录器，使用每日轮转文件传输。
 * 将 HTTP 请求记录到 logs/requests/request-%DATE%.log
 * 在非生产环境中，也会在 debug 级别输出到控制台。
 *
 * @returns 配置为 HTTP 请求日志记录的 Winston 日志实例
 */
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

/**
 * 创建仅记录错误的日志记录器，使用每日轮转文件传输。
 * 将错误记录到 logs/errors/error-%DATE%.log
 * 在非生产环境中，也会在 error 级别输出到控制台。
 *
 * @returns 配置为错误日志记录的 Winston 日志实例
 */
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

/**
 * 创建通用事件日志记录器，使用每日轮转文件传输。
 * 将事件记录到 logs/events/events-%DATE%.log
 * 在非生产环境中，也会在 debug 级别输出到控制台。
 *
 * @returns 配置为事件日志记录的 Winston 日志实例
 */
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

// 导出的日志记录器 - 在模块加载时初始化

/** HTTP 请求日志记录器 - 记录到 logs/requests/request-%DATE%.log */
export const requestLogger = createRequestLogger();
/** 仅记录错误的日志记录器 - 记录到 logs/errors/error-%DATE%.log */
export const errorLogger = createErrorLogger();
/** 通用事件日志记录器 - 记录到 logs/events/events-%DATE%.log */
export const globalEventLogger = createEventLogger();

/**
 * 基于游戏 ID 的日志记录器工厂
 * 创建的 Winston 日志记录器会将游戏特定日志写入 logs/games/<gameId>/%DATE%.log
 * 每个游戏在其 gameId 子目录中获得自己的日志文件。
 *
 * @param gameId - 唯一的游戏标识符
 * @returns 指定游戏的 Winston 日志实例
 */
function createGameLogger(gameId: string): winston.Logger {
  const gameLogSubdir = path.join(gameLogDir, gameId);

  return winston.createLogger({
    level: chessConfig.log.level,
    defaultMeta: { service: 'chess-game', gameId },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        filename: path.join(gameLogSubdir, '%DATE%.log'),
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

// 游戏日志记录器的内存存储 - 防止为同一游戏重复创建日志记录器
const gameLoggers: Map<string, winston.Logger> = new Map();

/**
 * 获取或创建给定 gameId 的游戏特定日志记录器。
 * 日志记录器被缓存，因此使用相同 gameId 的重复调用返回相同的日志实例。
 *
 * @param gameId - 唯一的游戏标识符
 * @returns 为指定游戏配置的 Winston 日志实例
 */
export function getGameLogger(gameId: string): winston.Logger {
  let logger = gameLoggers.get(gameId);
  if (!logger) {
    logger = createGameLogger(gameId);
    gameLoggers.set(gameId, logger);
  }
  return logger;
}

/**
 * 记录游戏生命周期事件，包含详细元数据。
 * 同时写入：
 *   - 游戏特定的日志文件（logs/games/<gameId>/<date>.log）
 *   - 全局事件日志（logs/events/events-<date>.log）
 *
 * 当游戏状态改变（创建、移动、结束、中止）时从 @chess/core 调用。
 *
 * @param gameId - 游戏标识符
 * @param action - 要记录的动作（'created' | 'move' | 'finished' | 'aborted'）
 * @param metadata - 额外的事件特定元数据
 */
export function logGameLifecycle(
  gameId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): void {
  const gameLogger = getGameLogger(gameId);

  const eventData = {
    action,
    gameId,
    timestamp: Date.now(),
    ...metadata,
  };

  // 写入游戏的专用日志文件
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

  // 同时写入全局事件日志以进行跨游戏监控
  globalEventLogger.info('game_event', {
    eventType: 'GAME',
    source: 'core',
    gameId,
    action,
    ...metadata,
  });
}

/**
 * 清除内部游戏日志记录器缓存。
 * 在关闭或游戏完全清理时调用，以防止内存泄漏。
 *
 * @param gameId - 可选的要清除的特定游戏 ID。如果省略，清除所有游戏日志记录器。
 */
export function clearGameLogger(gameId?: string): void {
  if (gameId) {
    gameLoggers.delete(gameId);
  } else {
    gameLoggers.clear();
  }
}

/**
 * 记录 WebSocket 事件，包含玩家和可选的游戏上下文。
 * 同时记录到 requestLogger 和 globalEventLogger。
 *
 * @param event - WebSocket 事件名称/类型
 * @param playerId - 与事件关联的玩家 ID
 * @param gameId - 可选的与事件关联的游戏 ID
 * @param details - 可选的额外元数据
 */
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

/**
 * 记录 HTTP 请求，包含方法、URL、状态码和持续时间。
 * 同时记录到 requestLogger 和 globalEventLogger。
 *
 * @param method - HTTP 方法（GET、POST 等）
 * @param url - 请求的完整 URL
 * @param path - 请求路径
 * @param statusCode - HTTP 状态码
 * @param duration - 请求持续时间（毫秒）
 * @param ip - 可选的客户端 IP 地址
 * @param userAgent - 可选的用户代理字符串
 * @param playerId - 可选的与请求关联的玩家 ID
 */
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

/**
 * 记录错误，包含可选的堆栈跟踪和额外上下文。
 * 同时记录到 errorLogger 和 globalEventLogger。
 *
 * @param message - 要记录的错误消息
 * @param error - 可选的 Error 对象，用于提取消息和堆栈跟踪
 * @param context - 可选的额外上下文元数据
 */
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

/**
 * 通用事件日志记录器，包含 eventType、source 和元数据。
 * 使用 eventType 分类记录到 globalEventLogger。
 *
 * @param eventType - 事件类型（GAME、HTTP、WEBSOCKET、SYSTEM、ERROR）
 * @param source - 事件来源（例如 'backend'）
 * @param metadata - 要记录的额外元数据
 * @param playerId - 可选的玩家 ID
 * @param gameId - 可选的游戏 ID
 */
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

/**
 * 记录游戏相关事件的便捷函数。
 * 使用 eventType 'GAME' 和 source 'backend' 调用 logEvent。
 *
 * @param gameId - 游戏 ID
 * @param action - 要记录的动作（例如 'move'、'chat'）
 * @param playerId - 与动作关联的玩家 ID
 * @param metadata - 额外元数据
 */
export function logGameEvent(
  gameId: string,
  action: string,
  playerId: string,
  metadata: Record<string, unknown> = {}
): void {
  logEvent('GAME', 'backend', { action, ...metadata }, playerId, gameId);
}

/**
 * 记录系统相关事件的便捷函数。
 * 使用 eventType 'SYSTEM' 和 source 'backend' 调用 logEvent。
 *
 * @param message - 要记录的系统消息
 * @param metadata - 额外元数据
 */
export function logSystemEvent(
  message: string,
  metadata: Record<string, unknown> = {}
): void {
  logEvent('SYSTEM', 'backend', { message, ...metadata });
}

/**
 * 记录通过 HTTP API 接收的客户端（前端）日志条目。
 * 使用 eventType 'CLIENT' 标记日志，以区别于服务器日志。
 *
 * @param level - 日志级别（debug、info、warn、error）
 * @param message - 前端的日志消息
 * @param timestamp - 客户端创建日志时的 Unix 时间戳
 * @param metadata - 来自客户端的额外元数据
 * @param playerId - 如果可用则可选的玩家 ID
 * @param gameId - 如果可用则可选的游戏 ID
 */
export function logClientLogEvent(
  level: string,
  message: string,
  timestamp: number,
  metadata?: Record<string, unknown>,
  playerId?: string,
  gameId?: string
): void {
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
}

export { createEventLogger };