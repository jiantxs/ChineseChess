/**
 * @file CommonCaptureEffect - 棋子捕获效果 (Common 拟物风格)
 * 棋子被吃时渲染简洁的淡出效果。
 */

import { BaseAnimation } from '../../../animations/BaseAnimation';
import { BoardMetrics } from '../../../types/canvas';
import { Side } from '@chess/types';

/**
 * 棋子被捕获时的简洁效果。
 * Common风格：简单的圆形扩散淡出。
 */
export class CommonCaptureEffect extends BaseAnimation {
  readonly id: string;
  private x: number;
  private y: number;
  private side: Side;
  private duration: number = 500; // 毫秒

  constructor(x: number, y: number, side: Side, uniqueId: string) {
    super(`capture-${uniqueId}`);
    this.id = `capture-${uniqueId}`;
    this.x = x;
    this.y = y;
    this.side = side;
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    if (this.elapsedTime > this.duration) {
      this.complete();
    }
  }

  render(ctx: CanvasRenderingContext2D, _metrics: BoardMetrics): void {
    const progress = this.elapsedTime / this.duration;
    const alpha = 1 - progress;

    if (alpha <= 0) return;

    const color = this.side === Side.RED ? '#b71c1c' : '#1a1a1a';

    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = color;

    // 简单的圆形扩散
    const radius = 20 + progress * 30;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
