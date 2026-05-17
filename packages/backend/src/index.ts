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
import { createServer } from 'http';
import { chessConfig } from '@chess/config';
import { GameServer } from './services/gameServer';
import { gameManager } from '@chess/core';
import { createAppRouter } from './routes';
import { requestLogger, logSystemEvent } from './services/logger';

/** Express 应用实例 */
const app = express();

/** HTTP 服务器实例，包装 Express 应用 */
const server = createServer(app);

/** 配置中的 URL 前缀（例如 '/aabbcc'） */
const PREFIX = chessConfig.server.prefix;

// 创建并挂载应用路由器
const appRouter = createAppRouter();

if (PREFIX) {
  app.use(PREFIX, appRouter);
  logSystemEvent('Routes mounted at prefix', { prefix: PREFIX });
} else {
  app.use(appRouter);
}

/**
 * WebSocket 游戏服务器实例
 * @remarks 通过 /ws 路径处理实时多人游戏逻辑
 * @see {@link GameServer}
 */
const gameServer = new GameServer(server, gameManager, PREFIX);

// 在 app.locals 中存储 gameServer 引用，以便路由访问
app.locals.gameServer = gameServer;

/** 服务器端口来自配置（默认：3000） */
const PORT = chessConfig.server.port;

/** 服务器主机来自配置（默认：0.0.0.0） */
const HOST = chessConfig.server.host;

/**
 * 启动 HTTP 和 WebSocket 服务器
 * @remarks 开始监听配置的主机和端口，记录启动消息
 */
server.listen(PORT, HOST, () => {
  requestLogger.info('server_started', { host: HOST, port: PORT, prefix: PREFIX });
  logSystemEvent('Chinese Chess server started', { host: HOST, port: PORT, url: `http://${HOST}:${PORT}${PREFIX}` });
});

/**
 * 优雅关闭处理器
 * @remarks 监听 SIGTERM 信号，停止 GameServer 间隔，关闭 HTTP 服务器，
 * 然后干净地退出进程。确保 WebSocket 连接和定时器的正确清理。
 * @param signal - 接收到的信号（SIGTERM）
 */
process.on('SIGTERM', () => {
  logSystemEvent('SIGTERM received, shutting down gracefully');
  gameServer.stop();
  server.close(() => {
    logSystemEvent('Server closed');
    process.exit(0);
  });
});
