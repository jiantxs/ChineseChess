import { GameState, Side, Position } from '../../../shared/types';
export declare class GameManager {
    private games;
    private playerGames;
    createGame(): GameState;
    getGame(gameId: string): GameState | undefined;
    joinGame(gameId: string, playerId: string, side?: Side): GameState | null;
    makeMove(gameId: string, playerId: string, from: Position, to: Position): {
        success: boolean;
        game?: GameState;
        error?: string;
    };
    leaveGame(gameId: string, playerId: string): GameState | null;
    getPlayerGame(playerId: string): GameState | undefined;
    private createInitialBoard;
    cleanupInactiveGames(maxAgeMs: number): number;
    getAllGames(): GameState[];
}
//# sourceMappingURL=gameManager.d.ts.map