/**
 * @file 画布渲染的基类分层抽象
 * 所有画布分层必须扩展此类。
 */

import { BoardMetrics } from '../types/canvas';

/**
 * 所有画布渲染分层的抽象基类。
 * 分层按其 z-index 顺序渲染（从低到高）。
 */
export abstract class BaseLayer {
  /** 分层优先级 - 更高值渲染在顶部 */
  abstract readonly zIndex: number;

  /**
   * 将此分层渲染到画布。
   * @param ctx - 画布 2D 渲染上下文
   * @param metrics - 棋盘布局度量
   * @param elapsedTime - 渲染循环开始后的总已用时间 (ms)
   * @param deltaTime - 距上一帧的时间 (ms)
   */
  abstract render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    elapsedTime: number,
    deltaTime: number
  ): void;

  /**
   * 可选：分层添加到渲染器时调用。
   */
  onAttach?(): void;

  /**
   * 可选：分层从渲染器移除时调用。
   */
  onDetach?(): void;
}
