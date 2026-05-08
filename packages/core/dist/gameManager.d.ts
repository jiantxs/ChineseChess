import type { GameState, Position } from './types';
import { Side } from './types';
import { PieceLayout } from './pieceLayout';
/**
 * GameManager - Singleton for in-memory Chinese Chess game state management.
 *
 * This module provides the GameManager singleton for managing all game state in memory.
 * It maintains:
 * - `games`: Map<gameId, GameState> - all active and finished games
 * - `playerGames`: Map<playerId, gameId> - player to game mapping
 *
 * Usage:
 *   import { gameManager } from '@chess/core';
 *   const game = gameManager.createGame(layout);
 *
 * IMPORTANT: The cleanupInactiveGames method must be called externally
 * (e.g., by a scheduled job or the WebSocket server) to periodically
 * remove finished/aborted games from memory.
 *
 * @module GameManager
 */
export declare class GameManager {
    /**
     * Singleton GameManager for managing all game state in memory.
     * Uses a private static instance field to ensure only one instance exists.
     * The constructor is private to prevent direct instantiation - use getInstance() instead.
     */
    private static instance;
    private games;
    private playerGames;
    private constructor();
    /**
     * Returns the singleton GameManager instance.
     * Creates a new instance if one does not already exist.
     * @returns The singleton GameManager instance
     */
    static getInstance(): GameManager;
    /**
     * Creates a new game with the given layout and optional local mode.
     * Finishes any games still in PLAYING or WAITING status before creating.
     * @param layout - PieceLayout instance defining initial board setup
     * @param local - If true, game is hot-seat mode (both sides same player)
     * @returns Newly created GameState
     */
    createGame(layout: PieceLayout, local?: boolean): GameState;
    /**
     * Retrieves a game by its unique identifier.
     * @param gameId - UUID of the game to retrieve
     * @returns GameState if found, undefined otherwise
     */
    getGame(gameId: string): GameState | undefined;
    /**
     * Adds a player to an existing game or creates a local game.
     * For local games, both sides are assigned to the same player.
     * For online games, player joins the specified side or an available side.
     * @param gameId - Game to join
     * @param playerId - Player's unique identifier
     * @param side - Optional specific side (RED/BLACK) to join
     * @returns Updated GameState if join succeeds, null otherwise
     */
    joinGame(gameId: string, playerId: string, side?: Side): GameState | null;
    /**
     * Executes a move in the specified game.
     * Validates turn order, piece ownership, and move legality before applying.
     * Updates the board, records the move, switches turn, and checks win condition.
     * @param gameId - Game to make move in
     * @param playerId - Player making the move
     * @param from - Source position {row, col}
     * @param to - Destination position {row, col}
     * @returns Object with success flag, updated game if successful, or error message
     */
    makeMove(gameId: string, playerId: string, from: Position, to: Position): {
        success: boolean;
        game?: GameState;
        error?: string;
    };
    /**
     * Removes a player from the game.
     * For games in progress, this forfeits the game for the leaving player.
     * If both players leave, the game is deleted.
     * @param gameId - Game to leave
     * @param playerId - Player leaving the game
     * @returns Updated GameState if game continues, null if game deleted
     */
    leaveGame(gameId: string, playerId: string): GameState | null;
    /**
     * Finds the game a player is currently in.
     * @param playerId - Player's unique identifier
     * @returns GameState if player is in a game, undefined otherwise
     */
    getPlayerGame(playerId: string): GameState | undefined;
    /**
     * Gets all valid destination positions for the piece at the given position.
     * Validates that it is the player's turn (for online games).
     * @param gameId - Game to query
     * @param playerId - Player requesting valid moves (validates turn)
     * @param position - {row, col} of piece to get moves for
     * @returns Array of valid destination positions
     */
    getValidMoves(gameId: string, playerId: string, position: Position): Position[];
    /**
     * Removes finished or aborted games older than the specified max age.
     * @param maxAgeMs - Maximum age in milliseconds (e.g., 3600000 for 1 hour)
     * @returns Number of games cleaned up
     */
    cleanupInactiveGames(maxAgeMs: number): number;
    /**
     * Creates a 10x9 board array from a pieces array.
     * Initializes empty cells as null, then places pieces at their positions.
     * @param pieces - Array of Piece objects with position data
     * @returns 2D array (Piece | null)[][] representing the board
     */
    private buildBoard;
    /**
     * Returns all games currently in memory.
     * @returns Array of all GameState objects
     */
    getAllGames(): GameState[];
}
export declare const gameManager: GameManager;
//# sourceMappingURL=gameManager.d.ts.map