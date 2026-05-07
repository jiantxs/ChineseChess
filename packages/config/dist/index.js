"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chessConfig = exports.defaultConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function detectMonorepoRoot(fromDir) {
    let current = fromDir;
    const maxDepth = 10;
    for (let i = 0; i < maxDepth; i++) {
        if (fs_1.default.existsSync(path_1.default.join(current, 'pnpm-workspace.yaml'))) {
            return current;
        }
        const parent = path_1.default.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    return path_1.default.resolve(fromDir, '../..');
}
const monorepoRoot = detectMonorepoRoot(path_1.default.resolve(__dirname, '..'));
exports.defaultConfig = {
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
        requestLogDir: path_1.default.join(monorepoRoot, 'logs', 'requests'),
        errorLogDir: path_1.default.join(monorepoRoot, 'logs', 'errors'),
        gameLogDir: path_1.default.join(monorepoRoot, 'logs', 'games'),
        maxFiles: '30d',
        monorepoRoot,
    },
    admin: {
        password: process.env.ADMIN_PASSWORD || 'admin123',
    },
};
function loadConfig() {
    const config = { ...exports.defaultConfig };
    if (process.env.PORT) {
        config.server.port = parseInt(process.env.PORT, 10);
    }
    if (process.env.NODE_ENV === 'production') {
        config.ai.enabled = process.env.ENABLE_AI === 'true';
    }
    return config;
}
exports.chessConfig = loadConfig();
exports.default = exports.chessConfig;
//# sourceMappingURL=index.js.map