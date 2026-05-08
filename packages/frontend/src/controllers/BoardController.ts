import { useState, useCallback, useRef, useEffect } from 'react';
import { Position, GameState, GameStatus } from '@chess/core';

export interface BoardControllerState {
  selectedPosition: Position | null;
  validMoves: Position[];
}

export class BoardController {
  private gameState: GameState | null = null;
  private selectedPos: Position | null = null;
  private validMoves: Position[] = [];
  private onMoveCallback: (from: Position, to: Position) => void;
  private onGetValidMovesCallback?: (position: Position) => void;
  private subscribers: Set<(state: BoardControllerState) => void> = new Set();

  constructor(
    onMove: (from: Position, to: Position) => void,
    onGetValidMoves?: (position: Position) => void
  ) {
    this.onMoveCallback = onMove;
    this.onGetValidMovesCallback = onGetValidMoves;
  }

  setCallbacks(
    onMove: (from: Position, to: Position) => void,
    onGetValidMoves?: (position: Position) => void
  ): void {
    this.onMoveCallback = onMove;
    this.onGetValidMovesCallback = onGetValidMoves;
  }

  subscribe(callback: (state: BoardControllerState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.subscribers.forEach(cb => cb(state));
  }

  private getState(): BoardControllerState {
    return {
      selectedPosition: this.selectedPos,
      validMoves: this.validMoves,
    };
  }

  setGameState(state: GameState | null): void {
    this.gameState = state;
  }

  setValidMoves(moves: Position[]): void {
    this.validMoves = moves;
    this.notify();
  }

  onBoardClick(pos: Position, hasPiece: boolean): void {
    if (!this.gameState) return;
    
    const status = this.gameState.status;
    if (status !== GameStatus.PLAYING && status !== GameStatus.WAITING) return;

    if (hasPiece) {
      const piece = this.gameState.board[pos.row][pos.col];
      if (piece && piece.side === this.gameState.currentTurn) {
        this.selectedPos = pos;
        this.notify();
        this.onGetValidMovesCallback?.(pos);
        return;
      }
    }

    if (this.selectedPos && this.isValidMove(pos)) {
      this.onMoveCallback(this.selectedPos, pos);
      this.selectedPos = null;
      this.validMoves = [];
      this.notify();
    }
  }

  resetSelection(): void {
    this.selectedPos = null;
    this.validMoves = [];
    this.notify();
  }

  private isValidMove(pos: Position): boolean {
    return this.validMoves.some(m => m.row === pos.row && m.col === pos.col);
  }
}

export function useBoardController(
  onMove: (from: Position, to: Position) => void,
  onGetValidMoves?: (position: Position) => void
) {
  const controllerRef = useRef<BoardController | null>(null);
  const [state, setState] = useState<BoardControllerState>({
    selectedPosition: null,
    validMoves: [],
  });
  const callbacksRef = useRef({ onMove, onGetValidMoves });

  callbacksRef.current = { onMove, onGetValidMoves };

  if (!controllerRef.current) {
    controllerRef.current = new BoardController(onMove, onGetValidMoves);
  }

  useEffect(() => {
    controllerRef.current!.setCallbacks(onMove, onGetValidMoves);
  }, [onMove, onGetValidMoves]);

  useEffect(() => {
    const controller = controllerRef.current!;
    return controller.subscribe(setState);
  }, []);

  const setGameState = useCallback((gameState: GameState | null) => {
    controllerRef.current?.setGameState(gameState);
  }, []);

  const setValidMoves = useCallback((moves: Position[]) => {
    controllerRef.current?.setValidMoves(moves);
  }, []);

  const resetSelection = useCallback(() => {
    controllerRef.current?.resetSelection();
  }, []);

  const onBoardClick = useCallback((pos: Position, hasPiece: boolean) => {
    controllerRef.current?.onBoardClick(pos, hasPiece);
  }, []);

  return {
    controller: controllerRef.current,
    state,
    setGameState,
    setValidMoves,
    resetSelection,
    onBoardClick,
  };
}
