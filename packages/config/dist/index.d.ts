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
export declare const defaultConfig: ChessConfig;
export declare const chessConfig: ChessConfig;
export default chessConfig;
//# sourceMappingURL=index.d.ts.map