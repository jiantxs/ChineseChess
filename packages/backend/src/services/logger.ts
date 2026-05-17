/**
 * @fileoverview Winston 日志器重新导出和 Express 中间件
 * @module backend/src/services/logger
 *
 * 从 @chess/logger 包重新导出所有日志器，并提供
 * 用于记录 HTTP 请求和 WebSocket 事件的自定义中间件和辅助函数。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import {
  requestLogger,
  errorLogger,
  globalEventLogger,
  logHttpRequest,
  logError,
  logEvent,
  logGameEvent,
  logGameLifecycle,
  logSystemEvent,
  logClientLogEvent,
  getGameLogger,
  clearGameLogger,
} from '@chess/logger';
import type express from 'express';

/**
 * Winston 日志器，用于 HTTP 请求日志
 * @remarks 通过 DailyRotateFile 写入 logs/requests/ 目录
 */
export { requestLogger };

/**
 * Winston 日志器，用于错误日志
 * @remarks 通过 DailyRotateFile 写入 logs/errors/ 目录
 */
export { errorLogger };

/**
 * Winston 日志器，用于全局事件
 * @remarks 写入 logs/events/ 目录，用于游戏和系统事件
 */
export { globalEventLogger };

/** @ignore 为方便起见重新导出 */
export { logHttpRequest, logError, logEvent, logGameEvent, logGameLifecycle, logSystemEvent, logClientLogEvent };
/** @ignore 重新导出用于游戏日志管理器管理 */
export { getGameLogger, clearGameLogger };

/**
 * 将 WebSocket 事件记录到请求和事件日志器
 * @description 记录 WebSocket 事件（连接、消息、断开连接等），并带有玩家上下文和可选的游戏 ID，
 *              到请求日志器和全局事件日志器中进行全面跟踪。
 *
 * @param event - 事件名称/类型（例如 'connection'、'message'、'disconnect'）
 * @param playerId - 与事件关联的玩家的 UUID
 * @param gameId - 与事件关联的可选游戏 UUID
 * @param details - 可选的附加事件数据，包含在日志中
 *
 * @remarks
 * - 使用 'websocket_event' 前缀记录到 requestLogger
 * - 使用 eventType: 'WEBSOCKET' 和 source: 'backend' 记录到 globalEventLogger
 * - 如果未提供 gameId，则设置为 null 以保持日志结构一致
 *
 * @example
 * logWebSocketEvent('connection', playerId);
 * logWebSocketEvent('make_move', playerId, gameId, { moveNumber: 5, from: {row: 1, col: 1}, to: {row: 3, col: 1} });
 */
function logWebSocketEvent(
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

export { logWebSocketEvent };

/**
 * Express 中间件，用于记录 HTTP 请求
 * @description 创建中间件，记录所有传入的 HTTP 请求，包括：
 *              方法、URL、路径、状态码、响应时间、客户端 IP、
 *              用户代理和来自会话的玩家 ID。
 *
 * @returns Express 请求处理程序中间件
 *
 * @remarks
 * - 从收到请求到响应结束测量请求持续时间
 * - 如果可用，从 express-session 中获取 playerId
 * - 通过 logHttpRequest 记录，写入请求日志器
 * - 非阻塞：响应发送后在 'finish' 事件上记录
 *
 * @example
 * app.use(requestLogMiddleware());
 */
export function requestLogMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const playerId = (req.session as any)?.playerId || null;
      logHttpRequest(
        req.method,
        req.url,
        req.path,
        res.statusCode,
        duration,
        req.ip || req.socket.remoteAddress,
        req.get('user-agent'),
        playerId
      );
    });

    next();
  };
}