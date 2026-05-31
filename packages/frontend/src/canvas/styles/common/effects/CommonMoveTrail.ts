/**
 * @file CommonMoveTrail - 棋子移动轨迹效果 (Common 拟物风格)
 * 移动后渲染简洁的轨迹线。
 */

import { BaseAnimation } from '../../../animations/BaseAnimation';
import { BoardMetrics } from '../../../types/canvas';
import { Side } from '@chess/types';

/**
 * 显示棋子移动路径的轨迹效果。
 * Common风格：简洁的渐隐线条，无发光粒子。
 */
export class CommonMoveTrail extends BaseAnimation {
  readonly id: string;
  private fromX: number;
  private fromY: number;
  private toX: number;
  private toY: number;
  private side: Side;
  private duration: number = 600; // 毫秒

  constructor(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    side: Side,
    uniqueId: string
  ) {
    super(`trail-${uniqueId}`);
    this.id = `trail-${uniqueId}`;
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
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

    // 简洁的主轨迹线
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(this.fromX, this.fromY);
    ctx.lineTo(this.toX, this.toY);
    ctx.stroke();

    // 内部细线
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(this.fromX, this.fromY);
    ctx.lineTo(this.toX, this.toY);
    ctx.stroke();

    ctx.restore();
  }
}
