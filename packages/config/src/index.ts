import fs from 'fs';
import path from 'path';

function detectMonorepoRoot(fromDir: string): string {
  let current = fromDir;
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(fromDir, '../..');
}

const monorepoRoot = detectMonorepoRoot(path.resolve(__dirname, '..'));

export interface ChessConfig {
  server: {
    port: number;
    host: string;
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

export const defaultConfig: ChessConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
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
    maxFiles: '30d',
    monorepoRoot,
  },
  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};

function loadConfig(): ChessConfig {
  const config = { ...defaultConfig };
  if (process.env.PORT) {
    config.server.port = parseInt(process.env.PORT, 10);
  }
  if (process.env.NODE_ENV === 'production') {
    config.ai.enabled = process.env.ENABLE_AI === 'true';
  }
  return config;
}

export const chessConfig = loadConfig();
export default chessConfig;
