/**
 * @file Cyber3DBoardLayer - 第0层：3D 透视棋盘背景
 * 渲染带透视的梯形棋盘背景、网格线和九宫格斜线。
 * 四周保持透明，露出 Canvas 下层元素。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';

export class Cyber3DBoardLayer extends BaseLayer {
  readonly zIndex = 0;

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    const { projection, cols, rows } = metrics;
    if (!projection) return;

    // 计算棋盘四角投影
    const tl = projection.project(metrics, 0, 0);
    const tr = projection.project(metrics, cols - 1, 0);
    const br = projection.project(metrics, cols - 1, rows - 1);
    const bl = projection.project(metrics, 0, rows - 1);

    // 画梯形半透明背景
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(5, 12, 20, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 画横线（连接同行不同列的投影点）
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.22)';
    ctx.lineWidth = 1;
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      for (let col = 0; col < cols; col++) {
        const p = projection.project(metrics, col, row);
        if (col === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 画竖线（连接同列不同行的投影点）
    for (let col = 0; col < cols; col++) {
      ctx.beginPath();
      for (let row = 0; row < rows; row++) {
        const p = projection.project(metrics, col, row);
        if (row === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 楚河汉界分隔线（row 4 和 row 5 之间不画竖线，已在上面画出，这里加文字）
    this.drawRiverText(ctx, metrics, projection);

    // 九宫格斜线
    // 红方九宫：row 7-9, col 3-5
    this.drawDiagonal(ctx, metrics, projection, 3, 7, 5, 9);
    this.drawDiagonal(ctx, metrics, projection, 5, 7, 3, 9);
    // 黑方九宫：row 0-2, col 3-5
    this.drawDiagonal(ctx, metrics, projection, 3, 0, 5, 2);
    this.drawDiagonal(ctx, metrics, projection, 5, 0, 3, 2);
  }

  private drawRiverText(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    projection: NonNullable<BoardMetrics['projection']>
  ): void {
    const { cols } = metrics;
    // 在 row 4 和 5 中间的文字
    const left = projection.project(metrics, 0, 4.5);
    const right = projection.project(metrics, cols - 1, 4.5);
    const cx = (left.x + right.x) / 2;
    const cy = (left.y + right.y) / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scale = left.scale;
    ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = 'rgba(0, 255, 170, 0.4)';
    ctx.fillText('楚 河    汉 界', cx, cy);
    ctx.restore();
  }

  private drawDiagonal(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    projection: NonNullable<BoardMetrics['projection']>,
    c1: number,
    r1: number,
    c2: number,
    r2: number
  ): void {
    const p1 = projection.project(metrics, c1, r1);
    const p2 = projection.project(metrics, c2, r2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
