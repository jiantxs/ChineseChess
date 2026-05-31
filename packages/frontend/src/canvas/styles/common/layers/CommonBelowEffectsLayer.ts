/**
 * @file CommonBelowEffectsLayer - 第1层：棋盘下方渲染的效果 (Common 拟物风格)
 * Common风格不需要背景动画效果，此层为空实现。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { AnimationEngine } from '../../../animations/AnimationEngine';
import { BoardMetrics } from '../../../types/canvas';

/**
 * 第1层：在 chess 棋子下方渲染效果。
 * Common风格：无背景动画，空实现。
 */
export class CommonBelowEffectsLayer extends BaseLayer {
  readonly zIndex = 1;

  constructor(_animEngine: AnimationEngine) {
    super();
  }

  render(
    _ctx: CanvasRenderingContext2D,
    _metrics: BoardMetrics,
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    // Common风格不需要背景动画效果
  }
}
