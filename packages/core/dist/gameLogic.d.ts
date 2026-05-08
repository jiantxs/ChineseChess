import { Piece, Side, Position } from './types';
/**
 * Pure functions for Chinese Chess (Xiangqi) move validation.
 *
 * This module contains no side effects - all functions take board state as input
 * and return computed results based on Xiangqi rules.
 *
 * Board coordinate system: row 0 = black home (top), row 9 = red home (bottom)
 *
 * Usage:
 *   - isValidMove: validate if a move is legal for a given piece
 *   - isGeneralCaptured: check if game is over (a general was captured)
 *   - getValidMoves: get all valid destinations for a piece
 *
 * @module gameLogic
 */
/**
 * Validates if a move is legal for a given piece on the current board.
 * Checks board boundaries, piece collisions, and piece-type-specific rules.
 *
 * @param board - 2D array of (Piece | null), representing the current board state
 * @param piece - The piece to move, must include type and side
 * @param from - Current position {row, col} of the piece
 * @param to - Target position {row, col} to move to
 * @returns true if the move is valid according to Xiangqi rules, false otherwise
 */
export declare function isValidMove(board: (Piece | null)[][], piece: Piece, from: Position, to: Position): boolean;
/**
 * Checks if either general has been captured, determining game over condition.
 * In Xiangqi, capturing the opponent's general ends the game immediately.
 *
 * @param board - Current board state as 2D array of (Piece | null)
 * @returns Object with captured=true if a general is missing, winner is the surviving side
 */
export declare function isGeneralCaptured(board: (Piece | null)[][]): {
    captured: boolean;
    winner?: Side;
};
/**
 * Returns all valid destination positions for a given piece on the current board.
 * Scans all 90 board positions and returns only those that pass isValidMove validation.
 *
 * @param board - Current board state as 2D array of (Piece | null)
 * @param piece - The piece to get valid moves for, must include position
 * @returns Array of valid {row, col} positions the piece can move to
 */
export declare function getValidMoves(board: (Piece | null)[][], piece: Piece): Position[];
//# sourceMappingURL=gameLogic.d.ts.map