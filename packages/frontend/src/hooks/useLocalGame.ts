import { useCallback } from 'react';
import { useGameSocket } from './useGameSocket';
import type { GameState, Position } from '@chess/core';

interface UseLocalGameReturn {
  gameState: GameState | null;
  makeMove: (from: Position, to: Position) => void;
  resetGame: () => void;
}

export function useLocalGame(): UseLocalGameReturn {
  const socket = useGameSocket();

  const makeMove = useCallback((from: Position, to: Position) => {
    socket.makeMove(from, to);
  }, [socket]);

  const resetGame = useCallback(() => {
    socket.resetGame();
    socket.createGame(true);
  }, [socket]);

  return {
    gameState: socket.gameState,
    makeMove,
    resetGame,
  };
}