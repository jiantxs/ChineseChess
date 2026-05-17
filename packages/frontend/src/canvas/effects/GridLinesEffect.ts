/**
 * @file GridLinesEffect - 动态棋盘网格线
 * 渲染带流动光效的发光白色网格线。
 */

import { BaseAnimation } from '../animations/BaseAnimation';
import { BoardMetrics } from '../types/canvas';
import { BOARD_ROWS, BOARD_COLS } from '@chess/types';

/**
 * 棋盘的动态网格线。
 * 功能：
 * - 白色发光水平和垂直线
 * - 沿线流动光效（闪烁亮度）
 * - 装饰性边框框架
 */
export class GridLinesEffect extends BaseAnimation {
  readonly id = 'grid-lines';

  constructor() {
    super('grid-lines');
  }

  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    const { padding, cellSize, width, height } = metrics;

    // 计算棋盘边界
    const startX = padding;
    const startY = padding;
    const endX = padding + (BOARD_COLS - 1) * cellSize;
    const endY = padding + (BOARD_ROWS - 1) * cellSize;

    // 绘制带发光效果的边框框架
    this.drawBorder(ctx, startX, startY, endX, endY);

    // 绘制带流动效果的横向线
    for (let row = 0; row < BOARD_ROWS; row++) {
      const y = padding + row * cellSize;
      this.drawFlowingLine(ctx, startX, y, endX, y, true);
    }

    // 绘制带流动效果的纵向线
    for (let col = 0; col < BOARD_COLS; col++) {
      const x = padding + col * cellSize;
      // 跳过河面部分（4-5 行）
      this.drawFlowingLine(ctx, x, startY, x, padding + 4 * cellSize, false);
      this.drawFlowingLine(ctx, x, padding + 5 * cellSize, x, endY, false);
    }

    // 绘制宫殿对角线
    this.drawPalaceLines(ctx, padding, cellSize);
  }

  /**
   * 绘制带发光效果的外边框框架。
   */
  private drawBorder(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {
    const borderWidth = 2;
    const glowSize = 8;

    // Outer glow
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = glowSize;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(startX - 2, startY - 2, endX - startX + 4, endY - startY + 4);

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  /**
   * 绘制带流动光效的线。
   * 通过随时间变化的亮度创建闪烁效果。
   */
  private drawFlowingLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    isHorizontal: boolean
  ): void {
    const lineWidth = 1.2;
    const flowSpeed = 0.00045; // 光流速度
    const flowWavelength = 150; // 亮度变化波长

    // Create gradient with flowing effect
    const gradient = isHorizontal
      ? ctx.createLinearGradient(x1, 0, x2, 0)
      : ctx.createLinearGradient(0, y1, 0, y2);

    // 根据时间计算流动偏移
    const flowOffset = (this.elapsedTime * flowSpeed) % 1;

    // 添加带流动亮度的颜色停止点
    const stops = 8;
    for (let i = 0; i <= stops; i++) {
      const pos = i / stops;
      // 创建随时间移动的波形
      const wave = Math.sin((pos + flowOffset) * Math.PI * 4) * 0.5 + 0.5;
      const brightness = 0.4 + wave * 0.6; // 范围从 0.4 到 1.0
      const alpha = 0.5 + wave * 0.5;

      gradient.addColorStop(pos, `rgba(255, 255, 255, ${alpha})`);
    }

    // Draw main line with gradient
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 在更亮的段落上添加微妙发光
    const glowGradient = isHorizontal
      ? ctx.createLinearGradient(x1, 0, x2, 0)
      : ctx.createLinearGradient(0, y1, 0, y2);

    for (let i = 0; i <= stops; i++) {
      const pos = i / stops;
      const wave = Math.sin((pos + flowOffset) * Math.PI * 4) * 0.5 + 0.5;
      const alpha = wave * 0.3; // 微妙发光
      glowGradient.addColorStop(pos, `rgba(200, 220, 255, ${alpha})`);
    }

    ctx.strokeStyle = glowGradient;
    ctx.lineWidth = lineWidth * 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * 绘制宫殿对角线（宫殿区域的 X 标记）。
   */
  private drawPalaceLines(ctx: CanvasRenderingContext2D, padding: number, cellSize: number): void {
    const palaceSize = 2; // 3x3 宫殿 = 2 格跨度

    // 红方宫殿（顶部）：行 0-2，列 3-5
    const redPalaceY = padding;
    const redPalaceX = padding + 3 * cellSize;
    this.drawPalaceDiagonal(ctx, redPalaceX, redPalaceY, cellSize * palaceSize, true);

    // 黑方宫殿（底部）：行 7-9，列 3-5
    const blackPalaceY = padding + 7 * cellSize;
    const blackPalaceX = padding + 3 * cellSize;
    this.drawPalaceDiagonal(ctx, blackPalaceX, blackPalaceY, cellSize * palaceSize, false);
  }

  /**
   * 绘制宫殿的对角线。
   */
  private drawPalaceDiagonal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isRed: boolean
  ): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;

    // 左上到右下
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y + size);
    ctx.stroke();

    // 右上到左下
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.stroke();
  }
}
