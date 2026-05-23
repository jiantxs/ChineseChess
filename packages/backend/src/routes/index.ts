/**
 * @fileoverview Express 路由器，包含所有应用路由和中间件
 * @module backend/src/routes/index
 *
 * 将所有 Express 中间件和路由合并到单个路由器中，
 * 可以挂载在可配置的_prefix 路径上。
 */

import { Router } from 'express';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { chessConfig } from '@chess/config';
import { gameManager } from '@chess/core';
import gameRoutes from './game';
import configRoutes from './config';
import adminRoutes from './admin';
import { requestLogMiddleware, logError } from '../services/logger';

/**
 * 创建并配置带有所有中间件和路由的主应用路由器。
 * 此路由器可以挂载在主 Express 应用中的任何前缀路径上。
 *
 * @returns 配置好的 Express Router 实例
 */
export function createAppRouter(prefix:string, customPublicPath?: string): Router {
  const router = Router();

  // 中间件：解析 JSON 请求体
  router.use(express.json());

  // 中间件：使用 Winston 记录所有 HTTP 请求
  router.use(requestLogMiddleware());

  // 中间件：会话管理，用于玩家身份识别
  router.use(
    session({
      secret: chessConfig.server.sessionSecret,
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: chessConfig.server.sessionMaxAgeMs,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
      },
    })
  );

  // 在 /api/game 挂载游戏路由 - 处理玩家 ID 生成
  router.use('/api/game', gameRoutes);

  // 在 /api 挂载配置路由 - 返回服务器配置和布局
  router.use('/api', configRoutes);

  // 在 /api/admin 挂载管理路由 - 日志查看器
  router.use('/api/admin', adminRoutes);

  // 在路由器的 locals 中存储游戏管理器引用，以便路由访问
  router.use((req, res, next) => {
    (req as any).app.locals.gameManager = gameManager;
    next();
  });

  // 前端构建输出目录的路径
  const publicPath = customPublicPath || path.resolve(__dirname, '../../public');

  // 中间件：从前端构建目录提供静态文件
  router.use(express.static(publicPath));

  router.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.match(/\.\w+$/)) {
      return res.status(404).send('Not found');
    }
    res.redirect(prefix || '/');
  });

  // 全局错误处理中间件
  router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logError('Unhandled error in Express router', err, { path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
}
