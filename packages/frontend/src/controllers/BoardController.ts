/**
 * @file Class-based piece selection state management
 * Manages selected position, valid moves, and game state.
 * Uses subscriber pattern for React state synchronization.
 * Used by App.tsx for piece selection handling.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Position, GameState, GameStatus } from '@chess/core';

/**
 * Represents the current state of the board controller.
 * @interface BoardControllerState
 */
export interface BoardControllerState {
  /** Currently selected board position, or null if nothing selected */
  selectedPosition: Position | null;
  /** Array of valid destination positions for the selected piece */
  validMoves: Position[];
}

/**
 * Class-based controller for managing board piece selection and moves.
 * Maintains selected position, valid moves, and game state.
 * Uses subscriber pattern to notify React components of state changes.
 */
export class BoardController {
  private gameState: GameState | null = null;
  private selectedPos: Position | null = null;
  private validMoves: Position[] = [];
  private onMoveCallback: (from: Position, to: Position) => void;
  private onGetValidMovesCallback?: (position: Position) => void;
  private subscribers: Set<(state: BoardControllerState) => void> = new Set();

  /**
   * Creates a new BoardController instance.
   * @param onMove - Callback invoked when a valid move is executed (from, to)
   * @param onGetValidMoves - Optional callback to request valid moves for a position
   */
  constructor(
    onMove: (from: Position, to: Position) => void,
    onGetValidMoves?: (position: Position) => void
  ) {
    this.onMoveCallback = onMove;
    this.onGetValidMovesCallback = onGetValidMoves;
  }

  /**
   * Updates the callbacks after construction.
   * @param onMove - Callback invoked when a valid move is executed
   * @param onGetValidMoves - Optional callback to request valid moves
   */
  setCallbacks(
    onMove: (from: Position, to: Position) => void,
    onGetValidMoves?: (position: Position) => void
  ): void {
    this.onMoveCallback = onMove;
    this.onGetValidMovesCallback = onGetValidMoves;
  }

  /**
   * Subscribes to state changes. Callback is immediately invoked with current state.
   * @param callback - Function called whenever state changes
   * @returns Unsubscribe function to remove the subscription
   */
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

  /**
   * Updates the current game state.
   * @param state - The new game state, or null to clear
   */
  setGameState(state: GameState | null): void {
    this.gameState = state;
  }

  /**
   * Updates the valid moves for the currently selected piece.
   * @param moves - Array of valid destination positions
   */
  setValidMoves(moves: Position[]): void {
    this.validMoves = moves;
    this.notify();
  }

  /**
   * Handles a board cell click event.
   * Selects a piece if it belongs to the current player, or executes a move if destination is valid.
   * @param pos - The position that was clicked
   * @param hasPiece - Whether the clicked cell contains a piece
   */
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

  /**
   * Clears the current piece selection and valid moves.
   */
  resetSelection(): void {
    this.selectedPos = null;
    this.validMoves = [];
    this.notify();
  }

  private isValidMove(pos: Position): boolean {
    return this.validMoves.some(m => m.row === pos.row && m.col === pos.col);
  }
}

/**
 * React hook wrapping BoardController for use in functional components.
 * Maintains controller instance in a ref and syncs state with React.
 *
 * @param onMove - Callback when a move is executed
 * @param onGetValidMoves - Optional callback to fetch valid moves
 * @returns Object containing controller instance, state, and action setters
 */
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
