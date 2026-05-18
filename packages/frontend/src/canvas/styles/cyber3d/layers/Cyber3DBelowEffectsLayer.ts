/**
 * @file Cyber3DBelowEffectsLayer - 第1层：棋盘下方渲染的效果 (Cyber3D 风格)
 * 管理星空和网格效果等背景动画。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { AnimationEngine } from '../../../animations/AnimationEngine';
import { BoardMetrics } from '../../../types/canvas';

export class Cyber3DBelowEffectsLayer extends BaseLayer {
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
    this.animEngine.render(ctx, metrics);
  }
}
