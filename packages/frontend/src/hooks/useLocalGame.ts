import { useState, useEffect, useCallback } from 'react';
import {
  GameState,
  Side,
  Position,
  GameStatus,
  BOARD_ROWS,
  BOARD_COLS,
  INITIAL_BOARD,
  isValidMove,
  isGeneralCaptured,
} from '@chess/core';

interface UseLocalGameReturn {
  gameState: GameState | null;
  selectedPiece: Position | null;
  validMoves: Position[];
  makeMove: (from: Position, to: Position) => void;
  resetGame: () => void;
}

export function useLocalGame(): UseLocalGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

  const initializeGame = useCallback(() => {
    const board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    for (const piece of INITIAL_BOARD) {
      board[piece.position.row][piece.position.col] = { ...piece };
    }
    setGameState({
      id: 'local-game',
      board,
      currentTurn: Side.RED,
      moves: [],
      status: GameStatus.PLAYING,
      lastMoveTime: Date.now(),
      createdAt: Date.now(),
    });
    setSelectedPiece(null);
    setValidMoves([]);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const makeMove = useCallback((from: Position, to: Position) => {
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;

    const movingPiece = gameState.board[from.row][from.col];
    if (!movingPiece) return;

    const isValid = isValidMove(gameState.board, movingPiece, from, to);
    if (!isValid) return;

    const newBoard = gameState.board.map(row => [...row]);
    const capturedPiece = newBoard[to.row][to.col];
    
    newBoard[to.row][to.col] = { ...movingPiece, position: to };
    newBoard[from.row][from.col] = null;

    const generalStatus = isGeneralCaptured(newBoard);
    const newStatus = generalStatus.captured ? GameStatus.FINISHED : GameStatus.PLAYING;

    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        board: newBoard,
        currentTurn: prev.currentTurn === Side.RED ? Side.BLACK : Side.RED,
        moves: [...prev.moves, {
          from,
          to,
          piece: { ...movingPiece, position: to },
          capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
        }],
        status: newStatus,
        winner: generalStatus.winner,
        lastMoveTime: Date.now(),
      };
    });

    setSelectedPiece(null);
    setValidMoves([]);
  }, [gameState]);

  const resetGame = useCallback(() => {
    initializeGame();
  }, [initializeGame]);

  return {
    gameState,
    selectedPiece,
    validMoves,
    makeMove,
    resetGame,
  };
}
