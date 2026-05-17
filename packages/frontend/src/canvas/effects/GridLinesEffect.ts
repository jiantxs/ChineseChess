/**
 * @file GridLinesEffect - Animated chess board grid lines
 * Renders glowing white grid lines with flowing light effect.
 */

import { BaseAnimation } from '../animations/BaseAnimation';
import { BoardMetrics } from '../types/canvas';
import { BOARD_ROWS, BOARD_COLS } from '@chess/types';

/**
 * Animated grid lines for the chess board.
 * Features:
 * - White glowing horizontal and vertical lines
 * - Flowing light effect along lines (shimmering brightness)
 * - Decorative border frame
 */
export class GridLinesEffect extends BaseAnimation {
  readonly id = 'grid-lines';

  constructor() {
    super('grid-lines');
  }

  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    const { padding, cellSize, width, height } = metrics;

    // Calculate board boundaries
    const startX = padding;
    const startY = padding;
    const endX = padding + (BOARD_COLS - 1) * cellSize;
    const endY = padding + (BOARD_ROWS - 1) * cellSize;

    // Draw border frame with glow
    this.drawBorder(ctx, startX, startY, endX, endY);

    // Draw horizontal lines with flowing effect
    for (let row = 0; row < BOARD_ROWS; row++) {
      const y = padding + row * cellSize;
      this.drawFlowingLine(ctx, startX, y, endX, y, true);
    }

    // Draw vertical lines with flowing effect
    for (let col = 0; col < BOARD_COLS; col++) {
      const x = padding + col * cellSize;
      // Skip middle section for river (rows 4-5)
      this.drawFlowingLine(ctx, x, startY, x, padding + 4 * cellSize, false);
      this.drawFlowingLine(ctx, x, padding + 5 * cellSize, x, endY, false);
    }

    // Draw palace diagonal lines
    this.drawPalaceLines(ctx, padding, cellSize);
  }

  /**
   * Draw the outer border frame with glow effect.
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
   * Draw a line with flowing light effect.
   * Creates a shimmer by varying brightness along the line over time.
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
    const flowSpeed = 0.00045; // Speed of light flow
    const flowWavelength = 150; // Wavelength of brightness variation

    // Create gradient with flowing effect
    const gradient = isHorizontal
      ? ctx.createLinearGradient(x1, 0, x2, 0)
      : ctx.createLinearGradient(0, y1, 0, y2);

    // Calculate flow offset based on time
    const flowOffset = (this.elapsedTime * flowSpeed) % 1;

    // Add color stops with flowing brightness
    const stops = 8;
    for (let i = 0; i <= stops; i++) {
      const pos = i / stops;
      // Create wave pattern that moves over time
      const wave = Math.sin((pos + flowOffset) * Math.PI * 4) * 0.5 + 0.5;
      const brightness = 0.4 + wave * 0.6; // Range from 0.4 to 1.0
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

    // Add subtle glow on brighter sections
    const glowGradient = isHorizontal
      ? ctx.createLinearGradient(x1, 0, x2, 0)
      : ctx.createLinearGradient(0, y1, 0, y2);

    for (let i = 0; i <= stops; i++) {
      const pos = i / stops;
      const wave = Math.sin((pos + flowOffset) * Math.PI * 4) * 0.5 + 0.5;
      const alpha = wave * 0.3; // Subtle glow
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
   * Draw palace diagonal lines (X markings in palace area).
   */
  private drawPalaceLines(ctx: CanvasRenderingContext2D, padding: number, cellSize: number): void {
    const palaceSize = 2; // 3x3 palace = 2 cell spans

    // Red palace (top): rows 0-2, cols 3-5
    const redPalaceY = padding;
    const redPalaceX = padding + 3 * cellSize;
    this.drawPalaceDiagonal(ctx, redPalaceX, redPalaceY, cellSize * palaceSize, true);

    // Black palace (bottom): rows 7-9, cols 3-5
    const blackPalaceY = padding + 7 * cellSize;
    const blackPalaceX = padding + 3 * cellSize;
    this.drawPalaceDiagonal(ctx, blackPalaceX, blackPalaceY, cellSize * palaceSize, false);
  }

  /**
   * Draw diagonal lines for a palace.
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

    // Top-left to bottom-right
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y + size);
    ctx.stroke();

    // Top-right to bottom-left
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.stroke();
  }
}
