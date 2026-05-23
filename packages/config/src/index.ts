/**
 * @fileoverview 运行时配置模块，支持环境变量覆盖。
 *
 * 本模块提供应用程序的集中配置系统：
 * - 在整个应用程序中导入 `chessConfig` 获取所有配置值
 * - 配置由 `defaultConfig` 与环境变量合并构建
 * - 最终配置被冻结以防止运行时意外修改
 *
 * @module config
 */

import fs from 'fs';
import path from 'path';

/**
 * 从给定目录向上遍历父目录，查找 monorepo 根目录。
 * 以 pnpm-workspace.yaml 作为 monorepo 结构的标识。
 * 如果在 maxDepth 次迭代内未找到，则回退到默认路径。
 *
 * @param fromDir - 搜索的起始目录
 * @returns monorepo 根目录的绝对路径
 */
function detectMonorepoRoot(fromDir: string): string {
  let current = fromDir;
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(current, 'LICENSES.chromium.html'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(fromDir, '../..');
}

const monorepoRoot = detectMonorepoRoot(path.resolve(__dirname, '..'));

/**
 * 中国象棋应用程序的运行时配置接口。
 * 所有配置部分都支持环境变量覆盖。
 *
 * @property server - 服务器设置（端口、主机、会话配置）
 * @property game - 游戏会话设置（回合/重连超时、最大游戏数、棋盘尺寸）
 * @property ai - AI 对手设置（启用标志、难度 1-10、可选的外部端点）
 * @property frontend - 前端构建和开发服务器设置
 * @property assets - SVG 棋子资源和静态文件的路径
 * @property log - 日志配置（日志级别和 request/error/game 日志的目录路径）
 * @property admin - 管理面板认证
 */
export interface ChessConfig {
  server: {
    port: number;
    host: string;
    prefix: string;
    sessionSecret: string;
    sessionMaxAgeMs: number;
    platform : 'web' | 'win';
  };
  game: {
    turnTimeoutMs: number;
    reconnectTimeoutMs: number;
    maxGames: number;
    board: {
      rows: number;
      cols: number;
    };
  };
  ai: {
    enabled: boolean;
    difficulty: number;
    endpoint?: string;
  };
  frontend: {
    buildOutput: string;
    devPort: number;
  };
  assets: {
    svgPath: string;
    staticPath: string;
  };
  log: {
    level: string;
    requestLogDir: string;
    errorLogDir: string;
    gameLogDir: string;
    maxFiles: string;
    monorepoRoot: string;
  };
  admin: {
    password: string;
  };
}

// 基础配置，包含所有默认值 - 作为环境变量覆盖的基础
export const defaultConfig: ChessConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    prefix: '/abcc',
    sessionSecret: process.env.SESSION_SECRET || 'chinese-chess-secret-key-2024',
    sessionMaxAgeMs: 24 * 60 * 60 * 1000,
    platform: 'web'
  },
  game: {
    turnTimeoutMs: 60000,
    reconnectTimeoutMs: 30000,
    maxGames: 100,
    board: {
      rows: 10,
      cols: 9,
    },
  },
  ai: {
    enabled: false,
    difficulty: 5,
    endpoint: process.env.AI_ENDPOINT,
  },
  frontend: {
    buildOutput: './public',
    devPort: 5173,
  },
  assets: {
    svgPath: '/assets/svg',
    staticPath: '/public',
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    requestLogDir: path.join(monorepoRoot, 'logs', 'requests'),
    errorLogDir: path.join(monorepoRoot, 'logs', 'errors'),
    gameLogDir: path.join(monorepoRoot, 'logs', 'games'),
    maxFiles: '30',
    monorepoRoot,
  },
  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};

/**
 * 创建中国象棋应用程序的运行时配置实例。
 * 返回应用环境变量覆盖并可选合并 overrides 的配置对象。
 *
 * @param overrides - 可选的配置覆盖，会与 defaultConfig 合并
 * @returns 应用覆盖和合并后的冻结 ChessConfig 对象
 *
 * @remarks
 * - 环境变量覆盖优先级高于 defaultConfig 但低于 overrides
 * - 返回的配置对象会被冻结以防止运行时意外修改
 * - 这是创建 config 实例的唯一推荐方式
 *
 * @example
 * // 使用默认配置
 * const config = createChessConfig();
 *
 * // 使用部分覆盖
 * const config = createChessConfig({ server: { port: 8080 } });
 */
export function createChessConfig(overrides?: Partial<ChessConfig>): ChessConfig {
  const config = { ...defaultConfig };

  // 应用环境变量覆盖
  if (process.env.CCHESSPORT) {
    const port = parseInt(process.env.CCHESSPORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      config.server.port = port;
    }
  }
  if (process.env.CCHESSHOST) {
    config.server.host = process.env.CCHESSHOST;
  }
  if (process.env.CCHESSPREFIX) {
    config.server.prefix = process.env.CCHESSPREFIX;
  }
  config.ai.enabled = process.env.ENABLE_AI === 'true';

  // 应用运行时覆盖（最高优先级）
  if (overrides) {
    if (overrides.server) {
      config.server = { ...config.server, ...overrides.server };
    }
    if (overrides.game) {
      config.game = { ...config.game, ...overrides.game };
    }
    if (overrides.ai) {
      config.ai = { ...config.ai, ...overrides.ai };
    }
    if (overrides.frontend) {
      config.frontend = { ...config.frontend, ...overrides.frontend };
    }
    if (overrides.assets) {
      config.assets = { ...config.assets, ...overrides.assets };
    }
    if (overrides.log) {
      config.log = { ...config.log, ...overrides.log };
    }
    if (overrides.admin) {
      config.admin = { ...config.admin, ...overrides.admin };
    }
  }

  return Object.freeze(config);
}

/**
 * 对默认配置应用环境变量覆盖。
 * 当前支持：
 * - CCHESSPORT: 覆盖 server.port（验证范围 1-65535）
 * - NODE_ENV=production + ENABLE_AI=true: 启用 AI 对手
 *
 * @deprecated 请使用 createChessConfig() 代替
 * @returns 应用覆盖后的冻结 ChessConfig 对象
 */
function loadConfig(): ChessConfig {
  const config = { ...defaultConfig };
  if (process.env.CCHESSPORT) {
    const port = parseInt(process.env.CCHESSPORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      config.server.port = port;
    }
  }
  if (process.env.CCHESSHOST) {
    config.server.host = process.env.CCHESSHOST;
  }
  if (process.env.CCHESSPREFIX) {
    config.server.prefix = process.env.CCHESSPREFIX;
  }
  config.ai.enabled = process.env.ENABLE_AI === 'true';
  return Object.freeze(config);
}

// 应用环境变量覆盖后的冻结单例配置 - 在整个应用中使用
// @deprecated 请使用 createChessConfig() 创建实例
export const chessConfig = loadConfig();
export default chessConfig;
