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
import { chessConfig } from '@chess/config';
import { GameServer } from './services/gameServer';
import { gameManager } from '@chess/core';
import { createAppRouter } from './routes';
import { requestLogger, logSystemEvent } from './services/logger';

/**
 * 启动服务器的可选参数
 * @interface StartServerOptions
 * @description 允许自定义服务器端口、主机和 URL 前缀。
 *              如果未提供，则使用 chessConfig 中的默认值。
 */
export interface StartServerOptions {
  /** 服务器端口（默认：从 chessConfig 获取） */
  port?: number;
  /** 服务器主机（默认：从 chessConfig 获取） */
  host?: string;
  /** URL 前缀例如 '/aabbcc'（默认：从 chessConfig 获取） */
  prefix?: string;
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
 * @param options - 可选的服务器配置
 * @param options.port - 服务器端口（默认：chessConfig.server.port）
 * @param options.host - 服务器主机（默认：chessConfig.server.host）
 * @param options.prefix - URL 前缀（默认：chessConfig.server.prefix）
 * @returns 包含 app、server、gameServer 和 stop 函数的结果对象
 *
 * @remarks
 * - 所有配置均通过 options 参数或 chessConfig 默认值进行
 * - stop() 函数会停止 GameServer、关闭 HTTP 服务器并记录关闭
 * - 启动后记录服务器 URL 到系统日志
 */
export function startServer(options?: StartServerOptions): StartServerResult {
  const PORT = options?.port ?? chessConfig.server.port;
  const HOST = options?.host ?? chessConfig.server.host;
  const PREFIX = options?.prefix ?? chessConfig.server.prefix;

  const app = express();
  const server = createServer(app);

  const appRouter = createAppRouter(PREFIX, options?.publicPath);

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