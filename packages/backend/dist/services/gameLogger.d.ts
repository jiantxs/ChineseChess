import { Move, Side, Position, GameStatus } from '@chess/core';
export interface MoveRecord {
    moveNumber: number;
    timestamp: number;
    playerId: string;
    side: Side;
    from: Position;
    to: Position;
    pieceType: string;
    capturedPieceType?: string;
}
export interface GameRecord {
    gameId: string;
    createdAt: number;
    startedAt?: number;
    finishedAt?: number;
    status: GameStatus;
    redPlayer?: string;
    blackPlayer?: string;
    winner?: Side;
    winReason?: string;
    moves: MoveRecord[];
}
export declare class GameLogger {
    private activeGames;
    private logDir;
    constructor(logDir?: string);
    private ensureDirectories;
    startGame(gameId: string, redPlayer: string): void;
    playerJoined(gameId: string, playerId: string, side: Side): void;
    recordMove(gameId: string, move: Move, moveNumber: number, playerId: string, side: Side): void;
    finishGame(gameId: string, winner?: Side, reason?: string): void;
    abortGame(gameId: string, winner?: Side, reason?: string): void;
    private saveGameRecord;
    private archiveGame;
    getGameRecord(gameId: string): GameRecord | undefined;
    loadGameRecord(gameId: string): GameRecord | undefined;
}
//# sourceMappingURL=gameLogger.d.ts.map