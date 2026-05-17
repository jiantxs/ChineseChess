/**
 * @file CyberBelowEffectsLayer - 第1层：棋盘下方渲染的效果 (Cyber 风格)
 * 管理星空和网格效果等背景动画。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { AnimationEngine } from '../../../animations/AnimationEngine';
import { BoardMetrics } from '../../../types/canvas';

/**
 * 第1层：在 chess 棋子下方渲染动画效果。
 * 包括星空和动态网格线。
 */
export class CyberBelowEffectsLayer extends BaseLayer {
  readonly zIndex = 1;
  private animEngine: AnimationEngine;

  constructor(animEngine: AnimationEngine) {
    super();
    this.animEngine = animEngine;
  }

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    // 渲染所有棋子下方动画
    this.animEngine.render(ctx, metrics);
  }
}
