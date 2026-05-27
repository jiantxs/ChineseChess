/**
 * @fileoverview 基于会话的玩家 ID 端点
 * @module backend/src/routes/game
 *
 * 为中国象棋多人游戏提供基于会话的玩家身份识别。
 * 生成 UUID 玩家 ID 并存储在 Express 会话中。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { LoggerInstance } from '@chess/logger';

interface ClientLogPayload {
  level: string;
  message: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, unknown>;
}

/**
 * 创建游戏路由
 * @param loggerService - 可选的日志服务实例
 * @returns Express Router
 */
export function createGameRoutes(logger?: LoggerInstance): ExpressRouter {
  const router: ExpressRouter = Router();

  /**
   * 为基于会话的身份生成新的玩家 ID
   * @route POST /api/game/player-id
   * @description 创建一个 UUID playerId 并存储在会话中。
   *              供客户端建立 WebSocket 连接身份时使用。
   *
   * @param req - Express 请求（会话必须已初始化）
   * @param res - Express 响应，包含生成的 playerId
   * @returns 带有 playerId 属性的 JSON
   *
   * @example
   * // 请求
   * POST /api/game/player-id
   *
   * // 响应
   * { "playerId": "550e8400-e29b-41d4-a716-446655440000" }
   */
  router.post('/player-id', (req, res) => {
    const playerId = uuidv4();
    (req.session as any).playerId = playerId;
    res.json({ playerId });
  });

  /**
   * 退出游戏并关闭服务器
   * @route POST /api/game/exit
   * @description 接收前端的退出请求，响应成功，
   *              然后优雅地关闭服务器进程。
   *
   * @param req - Express 请求
   * @param res - Express 响应，确认关闭启动
   * @returns 带有成功消息的 JSON
   *
   * @example
   * // 请求
   * POST /api/game/exit
   *
   * // 响应
   * { "message": "Server is shutting down" }
   */
  router.post('/exit', (req, res) => {
    res.json({ message: 'Server is shutting down' });

    // 允许在关闭之前发送响应
    setTimeout(() => {
      const gameServer = (req as any).app.locals.gameServer;
      try {
        if (gameServer && typeof gameServer.stop === 'function') {
          gameServer.stop();
        }
      } catch (err) {
        if (logger) {
          logger.logError('Error during server shutdown', err as Error, { context: 'gameServer.stop()' });
        }
      }
      process.exit(0);
    }, 100);
  });

  /**
   * 接收来自前端的客户端日志条目
   * @route POST /api/game/logs/client
   * @description 接收来自前端客户端的日志条目，并将其作为
   *              'frontend' 源属性在服务器端记录。
   *
   * @param req - Express 请求，body 中包含客户端日志
   * @param res - Express 响应，确认收到
   * @returns 带有成功消息的 JSON
   */
  router.post('/logs/client', (req, res) => {
    const payload = req.body as ClientLogPayload;
    const playerId = (req.session as any)?.playerId || undefined;

    if (!payload || !payload.level || !payload.message) {
      res.status(400).json({ error: 'Invalid log payload' });
      return;
    }

    if (logger) {
      logger.logClientLogEvent(
        payload.level,
        payload.message,
        payload.timestamp || Date.now(),
        payload.metadata,
        playerId
      );
    }

    res.json({ success: true });
  });

  return router;
}

export default createGameRoutes;