/**
 * @fileoverview 前端配置端点
 * @module backend/src/routes/config
 *
 * 向前端客户端提供服务器和游戏配置。
 * 返回可用的布局、服务器设置和资源路径。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { Router } from 'express';
import type { ChessConfig } from '@chess/config';
import { getAllLayoutNames, getAllLayouts } from '@chess/game-records';

/**
 * 创建配置路由
 * @param config - ChessConfig 实例
 * @returns Express Router
 */
export function createConfigRouter(config: ChessConfig): Router {
  const router: Router = Router();

  /**
   * 获取服务器配置和可用布局
   * @route GET /api/config
   * @description 返回全面的服务器配置，包括：
   *              - 服务器端口和主机
   *              - 带有元数据的可用游戏布局
   *              - 前端构建设置
   *              - SVG 棋子和其他静态文件的资源路径
   *
   * @param req - Express 请求（不需要参数）
   * @param res - Express 响应，包含配置 JSON
   * @returns 带有服务器、游戏、前端和资源配置的 JSON 对象
   *
   * @example
   * // 响应结构：
   * {
   *   "server": { "port": 3000, "host": "0.0.0.0" },
   *   "game": {
   *     "defaultLayout": "standard",
   *     "availableLayouts": ["standard", "dragon", "tiger", ...],
   *     "layouts": [{ "id": "standard", "name": "Standard", "description": "...", "tags": [...] }, ...]
   *   },
   *   "frontend": { "buildOutput": "...", "devPort": 5173 },
   *   "assets": { "svgPath": "...", "staticPath": "..." }
   * }
   */
  router.get('/config', (req, res) => {
    const layouts = getAllLayouts();
    res.json({
      server: {
        port: config.server.port,
        host: config.server.host,
        platform: config.server.platform
      },
      game: {
        defaultLayout: 'standard',
        availableLayouts: getAllLayoutNames(),
        layouts: layouts.map((l: { id: string; name: string; description: string; tags: string[] }) => ({
          id: l.id,
          name: l.name,
          description: l.description,
          tags: l.tags,
        })),
      },
      frontend: {
      },
      assets: {
      },
    });
  });

  return router;
}

export default createConfigRouter;