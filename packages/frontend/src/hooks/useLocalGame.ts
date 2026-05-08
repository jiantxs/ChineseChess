/**
 * @file Local hot-seat game hook
 * Wraps useGameSocket with local=true for hot-seat play.
 * Single player controls both sides on same device.
 */
import { useCallback } from 'react';
import { useGameSocket } from './useGameSocket';
import type { GameState, Position } from '@chess/core';

/**
 * Return type for the useLocalGame hook.
 * @interface UseLocalGameReturn
 */
interface UseLocalGameReturn {
  /** Current game state, or null if no game active */
  gameState: GameState | null;
  /** Array of valid moves for the currently selected piece */
  validMoves: Position[];
  /** Request valid moves for a given position */
  getValidMoves: (position: Position) => void;
  /** Execute a move from one position to another */
  makeMove: (from: Position, to: Position) => void;
  /** Reset the current game and start a new one */
  resetGame: () => void;
}

/**
 * Hook for local hot-seat play.
 * Creates a local game on mount and provides game controls.
 * Single player controls both Red and Black sides on the same device.
 *
 * @param layoutName - Name of the layout to use (default: 'standard')
 * @returns Game state and control functions
 */
export function useLocalGame(layoutName: string = 'standard'): UseLocalGameReturn {
  const socket = useGameSocket();

  const makeMove = useCallback((from: Position, to: Position) => {
    socket.makeMove(from, to);
  }, [socket]);

  const resetGame = useCallback(() => {
    socket.resetGame();
    socket.createGame(true, layoutName);
  }, [socket, layoutName]);

  return {
    gameState: socket.gameState,
    validMoves: socket.validMoves,
    getValidMoves: socket.getValidMoves,
    makeMove,
    resetGame,
  };
}