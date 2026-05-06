"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chessConfig = exports.defaultConfig = void 0;
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
        requestLogDir: 'logs/requests',
        errorLogDir: 'logs/errors',
        gameLogDir: 'logs/games',
        maxFiles: '30d',
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
//# sourceMappingURL=chess.config.js.map