/**
 * @file 本地双人对战 Hook
 * 使用 local=true 包装 useGameSocket，用于双人对战。
 * 单个玩家在同一设备上控制双方。
 */
import { useCallback } from 'react';
import { useGameSocket } from './useGameSocket';
import type { GameState, Position } from '@chess/types';

/**
 * useLocalGame Hook 的返回值类型。
 * @interface UseLocalGameReturn
 */
interface UseLocalGameReturn {
  /** 当前游戏状态，如果没有活动游戏则为 null */
  gameState: GameState | null;
  /** 当前选中棋子的有效移动位置数组 */
  validMoves: Position[];
  /** 请求给定位置的有效移动 */
  getValidMoves: (position: Position) => void;
  /** 执行从一位置到另一位置的移动 */
  makeMove: (from: Position, to: Position) => void;
  /** 重置当前游戏并开始新游戏 */
  resetGame: () => void;
}

/**
 * 用于本地双人对战的 Hook。
 * 挂载时创建本地游戏并提供游戏控制功能。
 * 单个玩家在同一设备上控制红方和黑方。
 *
 * @param layoutName - 要使用的布局名称（默认：'standard'）
 * @returns 游戏状态和控制函数
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