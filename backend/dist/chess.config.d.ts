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
    };
    admin: {
        password: string;
    };
}
export declare const defaultConfig: ChessConfig;
export declare const chessConfig: ChessConfig;
export default chessConfig;
//# sourceMappingURL=chess.config.d.ts.map