import { GameManager } from '@chess/core';
export declare class GameServer {
    private wss;
    private players;
    private gameManager;
    private pingInterval;
    private cleanupInterval;
    constructor(server: import('http').Server | import('https').Server, gameManager: GameManager);
    private setupWebSocketServer;
    private handleMessage;
    private handleJoinGame;
    private handleMakeMove;
    private handleLeaveGame;
    private handlePing;
    private handleAIMove;
    private handleDisconnect;
    private sendToPlayer;
    private broadcastToGame;
    private sendError;
    private sanitizeGameState;
    private startPingInterval;
    private startCleanupInterval;
    stop(): void;
}
//# sourceMappingURL=gameServer.d.ts.map