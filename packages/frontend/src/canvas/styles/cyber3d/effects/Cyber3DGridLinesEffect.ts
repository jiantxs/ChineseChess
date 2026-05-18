/**
 * @file Cyber3DGridLinesEffect - 3D 透视动态棋盘网格线
 * 在 CyberGridLinesEffect 基础上增加透视投影支持，光线随棋盘一起向灭点收敛。
 */

import { BaseAnimation } from '../../../animations/BaseAnimation';
import { BoardMetrics } from '../../../types/canvas';
import { BOARD_ROWS, BOARD_COLS } from '@chess/types';

/**
 * 3D 透视动态网格线。
 * 横竖线均按 projection 坐标绘制，并带流动光效。
 */
export class Cyber3DGridLinesEffect extends BaseAnimation {
  readonly id = 'grid-lines-3d';

  constructor() {
    super('grid-lines-3d');
  }

  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    const { projection } = metrics;
    if (!projection) {
      // 退化：若意外缺失投影，不绘制以避免覆盖错位
      return;
    }

    // 绘制带流动效果的横向线
    for (let row = 0; row < BOARD_ROWS; row++) {
      this.drawProjectedFlowingLine(ctx, metrics, projection, row, true);
    }

    // 绘制带流动效果的纵向线（跳过河面中间断开的部分）
    for (let col = 0; col < BOARD_COLS; col++) {
      // 上半部分 row 0-4
      this.drawProjectedFlowingLineSegment(ctx, metrics, projection, col, false, 0, 4);
      // 下半部分 row 5-9
      this.drawProjectedFlowingLineSegment(ctx, metrics, projection, col, false, 5, 9);
    }

    // 宫殿对角线
    this.drawProjectedPalaceLines(ctx, metrics, projection);
  }

  /**
   * 绘制一整条投影横线（col 从 0 到 cols-1）。
   */
  private drawProjectedFlowingLine(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    projection: NonNullable<BoardMetrics['projection']>,
    row: number,
    _isHorizontal: boolean
  ): void {
    const { cols } = metrics;
    const segments = cols - 1;
    const flowSpeed = 0.00045;
    const flowOffset = (this.elapsedTime * flowSpeed) % 1;

    for (let i = 0; i < segments; i++) {
      const p1 = projection.project(metrics, i, row);
      const p2 = projection.project(metrics, i + 1, row);

      const pos = i / segments;
      const wave = Math.sin((pos + flowOffset) * Math.PI * 4) * 0.5 + 0.5;
      const alpha = 0.5 + wave * 0.5;

      // 主光线
      ctx.strokeStyle = `rgba(0, 255, 170, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // 微弱发光
      ctx.strokeStyle = `rgba(0, 255, 170, ${wave * 0.25})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  /**
   * 绘制投影竖线的一段（row 从 start 到 end）。
   */
  private drawProjectedFlowingLineSegment(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    projection: NonNullable<BoardMetrics['projection']>,
    col: number,
    _isVertical: boolean,
    startRow: number,
    endRow: number
  ): void {
    const segments = endRow - startRow;
    if (segments <= 0) return;

    const flowSpeed = 0.00045;
    const flowOffset = (this.elapsedTime * flowSpeed) % 1;

    for (let i = 0; i < segments; i++) {
      const r1 = startRow + i;
      const r2 = startRow + i + 1;
      const p1 = projection.project(metrics, col, r1);
      const p2 = projection.project(metrics, col, r2);

      const pos = i / segments;
      const wave = Math.sin((pos + flowOffset) * Math.PI * 4) * 0.5 + 0.5;
      const alpha = 0.5 + wave * 0.5;

      ctx.strokeStyle = `rgba(0, 255, 170, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(0, 255, 170, ${wave * 0.25})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  /**
   * 绘制宫殿对角线（投影版）。
   */
  private drawProjectedPalaceLines(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    projection: NonNullable<BoardMetrics['projection']>
  ): void {
    // 黑方宫殿 row 0-2, col 3-5
    this.drawProjectedDiagonal(ctx, metrics, projection, 3, 0, 5, 2);
    this.drawProjectedDiagonal(ctx, metrics, projection, 5, 0, 3, 2);

    // 红方宫殿 row 7-9, col 3-5
    this.drawProjectedDiagonal(ctx, metrics, projection, 3, 7, 5, 9);
    this.drawProjectedDiagonal(ctx, metrics, projection, 5, 7, 3, 9);
  }

  private drawProjectedDiagonal(
    ctx: CanvasRenderingContext2D,
    _metrics: BoardMetrics,
    projection: NonNullable<BoardMetrics['projection']>,
    c1: number,
    r1: number,
    c2: number,
    r2: number
  ): void {
    const p1 = projection.project(_metrics, c1, r1);
    const p2 = projection.project(_metrics, c2, r2);
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}
