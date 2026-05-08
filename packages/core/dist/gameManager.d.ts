import type { GameState, Position } from './types';
import { Side } from './types';
import { PieceLayout } from './pieceLayout';
export declare class GameManager {
    private static instance;
    private games;
    private playerGames;
    private constructor();
    static getInstance(): GameManager;
    createGame(layout: PieceLayout, local?: boolean): GameState;
    getGame(gameId: string): GameState | undefined;
    joinGame(gameId: string, playerId: string, side?: Side): GameState | null;
    makeMove(gameId: string, playerId: string, from: Position, to: Position): {
        success: boolean;
        game?: GameState;
        error?: string;
    };
    leaveGame(gameId: string, playerId: string): GameState | null;
    getPlayerGame(playerId: string): GameState | undefined;
    getValidMoves(gameId: string, playerId: string, position: Position): Position[];
    private buildBoard;
    cleanupInactiveGames(maxAgeMs: number): number;
    getAllGames(): GameState[];
}
export declare const gameManager: GameManager;
//# sourceMappingURL=gameManager.d.ts.map