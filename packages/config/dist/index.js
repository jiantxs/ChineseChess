"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chessConfig = exports.defaultConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Traverses parent directories from the given directory to find the monorepo root.
 * Looks for pnpm-workspace.yaml as the indicator of a monorepo structure.
 * Falls back to a default path if not found within maxDepth iterations.
 *
 * @param fromDir - The starting directory for the search
 * @returns The absolute path to the monorepo root directory
 */
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
// Base configuration with all defaults - used as foundation for env overrides
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
function loadConfig() {
    const config = { ...exports.defaultConfig };
    if (process.env.PORT) {
        const port = parseInt(process.env.PORT, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
            config.server.port = port;
        }
    }
    if (process.env.NODE_ENV === 'production') {
        config.ai.enabled = process.env.ENABLE_AI === 'true';
    }
    return Object.freeze(config);
}
// Frozen singleton config after applying env overrides - use throughout the app
exports.chessConfig = loadConfig();
exports.default = exports.chessConfig;
//# sourceMappingURL=index.js.map