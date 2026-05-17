/**
 * @file 基于类的棋子选择状态管理
 * 管理选中的位置、合法移动和游戏状态。
 * 使用订阅者模式进行 React 状态同步。
 * 由 App.tsx 用于棋子选择处理。
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Position, GameState, GameStatus } from '@chess/types';

/**
 * 表示棋盘控制器的当前状态。
 * @interface BoardControllerState
 */
export interface BoardControllerState {
  /** 当前选中的棋盘位置，如果没有选中则为 null */
  selectedPosition: Position | null;
  /** 选中棋子的有效目标位置数组 */
  validMoves: Position[];
}

/**
 * 用于管理棋盘棋子选择和移动的类控制器。
 * 维护选中的位置、合法移动和游戏状态。
 * 使用订阅者模式通知 React 组件状态变更。
 */
export class BoardController {
  private gameState: GameState | null = null;
  private selectedPos: Position | null = null;
  private validMoves: Position[] = [];
  private onMoveCallback: (from: Position, to: Position) => void;
  private onGetValidMovesCallback?: (position: Position) => void;
  private subscribers: Set<(state: BoardControllerState) => void> = new Set();

  /**
   * 创建新的 BoardController 实例。
   * @param onMove - 执行有效移动时调用的回调 (from, to)
   * @param onGetValidMoves - 请求位置有效移动的可选回调
   */
  constructor(
    onMove: (from: Position, to: Position) => void,
    onGetValidMoves?: (position: Position) => void
  ) {
    this.onMoveCallback = onMove;
    this.onGetValidMovesCallback = onGetValidMoves;
  }

  /**
   * 构造后更新回调。
   * @param onMove - 执行有效移动时调用的回调
   * @param onGetValidMoves - 请求有效移动的可选回调
   */
  setCallbacks(
    onMove: (from: Position, to: Position) => void,
    onGetValidMoves?: (position: Position) => void
  ): void {
    this.onMoveCallback = onMove;
    this.onGetValidMovesCallback = onGetValidMoves;
  }

  /**
   * 订阅状态变更。回调会立即使用当前状态调用。
   * @param callback - 状态变更时调用的函数
   * @returns 取消订阅函数，用于移除订阅
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
   * 更新当前游戏状态。
   * @param state - 新的游戏状态，或为 null 以清除
   */
  setGameState(state: GameState | null): void {
    this.gameState = state;
  }

  /**
   * 更新当前选中棋子的合法移动。
   * @param moves - 有效目标位置数组
   */
  setValidMoves(moves: Position[]): void {
    this.validMoves = moves;
    this.notify();
  }

  /**
   * 处理棋盘格子点击事件。
   * 如果棋子属于当前玩家则选中它，如果目标是有效移动则执行移动。
   * @param pos - 被点击的位置
   * @param hasPiece - 点击的格子是否包含棋子
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
   * 清除当前棋子选择和合法移动。
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
 * React Hook，用于在函数组件中使用 BoardController。
 * 在 ref 中维护控制器实例并与 React 状态同步。
 *
 * @param onMove - 执行移动时的回调
 * @param onGetValidMoves - 获取有效移动的可选回调
 * @returns 包含控制器实例、状态和操作设置器的对象
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
