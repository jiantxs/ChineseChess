/**
 * @fileoverview 中国象棋后端 Express 服务器入口
 * @module backend/src/index
 *
 * 配置 Express HTTP 服务器，支持 WebSocket 实时多人对中国象棋游戏。
 * 处理会话中间件、静态文件服务、API 路由和优雅关闭。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { createChessConfig } from '@chess/config';
import type { ChessConfig } from '@chess/config';
import { GameServer } from './services/gameServer';
import { gameManager } from '@chess/core';
import { createAppRouter } from './routes';
import { requestLogger, logSystemEvent } from './services/logger';

/**
 * 启动服务器的可选参数
 * @interface StartServerOptions
 * @description 允许自定义服务器配置。
 */
export interface StartServerOptions {
  /** 前端静态文件目录路径（默认：从 __dirname 推导） */
  publicPath?: string;
}

/**
 * startServer 返回的服务器结果
 * @interface StartServerResult
 * @description 包含启动的服务器实例和停止函数。
 *              用于优雅关闭和测试。
 */
export interface StartServerResult {
  /** Express 应用实例 */
  app: express.Application;
  /** HTTP 服务器实例 */
  server: HttpServer;
  /** WebSocket 游戏服务器实例 */
  gameServer: GameServer;
  /** 停止所有服务器的函数 */
  stop: () => void;
}

/**
 * 启动 HTTP 和 WebSocket 服务器
 * @description 创建 Express 应用、HTTP 服务器、挂载路由、
 *              初始化 GameServer，并开始监听。
 *              设置 SIGTERM 处理器以实现优雅关闭。
 *
 * @param config - ChessConfig 实例
 * @param options - 可选的服务器配置
 * @param options.publicPath - 前端静态文件目录路径
 * @returns 包含 app、server、gameServer 和 stop 函数的结果对象
 *
 * @remarks
 * - config 实例必须直接传入，不会有默认值
 * - stop() 函数会停止 GameServer、关闭 HTTP 服务器并记录关闭
 * - 启动后记录服务器 URL 到系统日志
 */
export function startServer(config: ChessConfig, options?: StartServerOptions): StartServerResult {
  const PORT = config.server.port;
  const HOST = config.server.host;
  const PREFIX = config.server.prefix;

  const app = express();
  const server = createServer(app);

  const appRouter = createAppRouter(PREFIX, options?.publicPath, config);

  if (PREFIX) {
    app.use(PREFIX, appRouter);
    logSystemEvent('Routes mounted at prefix', { prefix: PREFIX });
  } else {
    app.use(appRouter);
  }

  const gameServer = new GameServer(server, gameManager, PREFIX);

  app.locals.gameServer = gameServer;

  server.listen(PORT, HOST, () => {
    requestLogger.info('server_started', { host: HOST, port: PORT, prefix: PREFIX });
    logSystemEvent('Chinese Chess server started', { host: HOST, port: PORT, url: `http://${HOST}:${PORT}${PREFIX}` });
  });

  const stop = () => {
    logSystemEvent('SIGTERM received, shutting down gracefully');
    gameServer.stop();
    server.close(() => {
      logSystemEvent('Server closed');
    });
  };

  process.on('SIGTERM', stop);

  return { app, server, gameServer, stop };
}