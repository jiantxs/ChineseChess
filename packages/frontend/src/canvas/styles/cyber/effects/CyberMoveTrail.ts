/**
 * @file CyberMoveTrail - 棋子移动轨迹效果 (Cyber 风格)
 * 移动后在从起点到终点渲染生动的渐隐轨迹线。
 */

import { BaseAnimation } from '../../../animations/BaseAnimation';
import { BoardMetrics } from '../../../types/canvas';
import { Side } from '@chess/types';

/**
 * 显示棋子移动路径的轨迹效果。
 * 创建带有粒子效果的高亮渐变线，快速淡出。
 */
export class CyberMoveTrail extends BaseAnimation {
  readonly id: string;
  private fromX: number;
  private fromY: number;
  private toX: number;
  private toY: number;
  private side: Side;
  private duration: number = 750; // 毫秒 - 减半
  private trailWidth: number = 5; // 更粗

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

    const color = this.side === Side.RED ? '#00f0ff' : '#ff00ff';

    ctx.save();

    // 明亮的主轨迹线
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = this.trailWidth;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * alpha;

    ctx.beginPath();
    ctx.moveTo(this.fromX, this.fromY);
    ctx.lineTo(this.toX, this.toY);
    ctx.stroke();

    // 内层白色核心以增加亮度
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = this.trailWidth * 0.4;
    ctx.shadowBlur = 10 * alpha;

    ctx.beginPath();
    ctx.moveTo(this.fromX, this.fromY);
    ctx.lineTo(this.toX, this.toY);
    ctx.stroke();

    // 沿轨迹的动态能量粒子
    const particleCount = 5;
    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;

    for (let i = 0; i < particleCount; i++) {
      const particleOffset = (this.elapsedTime * 0.003 + i / particleCount) % 1;
      const px = this.fromX + dx * particleOffset;
      const py = this.fromY + dy * particleOffset;
      const particleSize = 3 * (1 - particleOffset) * alpha;

      ctx.globalAlpha = alpha * 0.8 * (1 - particleOffset);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 * alpha;

      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 起点 - 明亮闪光
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 25 * alpha;
    ctx.beginPath();
    ctx.arc(this.fromX, this.fromY, 6, 0, Math.PI * 2);
    ctx.fill();

    // 起点外环
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.fromX, this.fromY, 10, 0, Math.PI * 2);
    ctx.stroke();

    // 终点 - 更亮闪光
    ctx.globalAlpha = alpha * 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 30 * alpha;
    ctx.beginPath();
    ctx.arc(this.toX, this.toY, 7, 0, Math.PI * 2);
    ctx.fill();

    // 终点外环
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.toX, this.toY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
