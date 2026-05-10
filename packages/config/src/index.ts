/**
 * @fileoverview Runtime configuration module with environment variable overrides.
 *
 * This module provides the application's central configuration system:
 * - Import `chessConfig` for all configuration values throughout the application
 * - Configuration is built from `defaultConfig` merged with environment variables
 * - The final config is frozen to prevent accidental mutations at runtime
 *
 * @module config
 */

import fs from 'fs';
import path from 'path';

/**
 * Traverses parent directories from the given directory to find the monorepo root.
 * Looks for pnpm-workspace.yaml as the indicator of a monorepo structure.
 * Falls back to a default path if not found within maxDepth iterations.
 *
 * @param fromDir - The starting directory for the search
 * @returns The absolute path to the monorepo root directory
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
 * Runtime configuration interface for the Chinese Chess application.
 * All configuration sections support environment variable overrides.
 *
 * @property server - Server settings (port, host, session configuration)
 * @property game - Game session settings (turn/reconnect timeouts, max games, board dimensions)
 * @property ai - AI opponent settings (enabled flag, difficulty 1-10, optional external endpoint)
 * @property frontend - Frontend build and dev server settings
 * @property assets - Asset paths for SVG pieces and static files
 * @property log - Logging configuration (levels and directory paths for request/error/game logs)
 * @property admin - Admin dashboard authentication
 */
export interface ChessConfig {
  server: {
    port: number;
    host: string;
    prefix: string;
    sessionSecret: string;
    sessionMaxAgeMs: number;
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

// Base configuration with all defaults - used as foundation for env overrides
export const defaultConfig: ChessConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    prefix: '/abcc',
    sessionSecret: process.env.SESSION_SECRET || 'chinese-chess-secret-key-2024',
    sessionMaxAgeMs: 24 * 60 * 60 * 1000,
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
 * Applies environment variable overrides to the default configuration.
 * Currently supports:
 * - PORT: overrides server.port (validated 1-65535)
 * - NODE_ENV=production + ENABLE_AI=true: enables AI opponent
 *
 * @returns A frozen ChessConfig object with overrides applied
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

// Frozen singleton config after applying env overrides - use throughout the app
export const chessConfig = loadConfig();
export default chessConfig;
