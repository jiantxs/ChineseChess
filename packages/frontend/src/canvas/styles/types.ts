/**
 * @file 棋盘风格系统类型定义
 * 定义渲染风格接口，实现渲染器与渲染内容的解耦。
 */

import { BaseLayer } from '../layers/BaseLayer';
import { AnimationEngine } from '../animations/AnimationEngine';
import { IAnimation } from '../types/canvas';
import { GameState, Position, Side } from '@chess/types';

/**
 * 棋子分层的通用接口。
 * 所有风格的棋子层都必须实现此接口，以便 ChessBoard 更新游戏状态。
 */
export interface PiecesLayerInterface extends BaseLayer {
  setGameState(state: GameState | null): void;
}

/**
 * 上层特效分层的通用接口。
 * 所有风格的上特效层都必须实现此接口，以便 ChessBoard 更新选中/可移动状态。
 */
export interface AboveEffectsLayerInterface extends BaseLayer {
  setSelectedPosition(pos: Position | null): void;
  setValidMoves(moves: Position[]): void;
  setGameState(state: GameState | null): void;
}

/**
 * 棋盘渲染风格接口。
 * 每种风格（如 cyber）必须实现此接口，提供完整的渲染内容实现。
 */
export interface BoardStyle {
  readonly name: string;

  /**
   * 创建该风格的所有分层。
   * @param animEngine - 由渲染套件管理的动画引擎，供需要渲染动画的分层使用
   * @returns 包含四个标准分层的对象
   */
  createLayers(animEngine: AnimationEngine): {
    boardLayer: BaseLayer;
    belowEffectsLayer: BaseLayer;
    piecesLayer: PiecesLayerInterface;
    aboveEffectsLayer: AboveEffectsLayerInterface;
  };

  /**
   * 创建背景动画（在渲染循环启动前注册到动画引擎）。
   * @returns 背景动画数组
   */
  createBackgroundAnimations(): IAnimation[];

  /**
   * 创建吃子特效。
   */
  createCaptureEffect(x: number, y: number, side: Side, uniqueId: string): IAnimation;

  /**
   * 创建移动轨迹特效。
   */
  createMoveTrail(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    side: Side,
    uniqueId: string
  ): IAnimation;
}
