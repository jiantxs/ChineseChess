/**
 * @file AboveEffectsLayer - Layer 3: Effects rendered above pieces
 * Renders dynamic selection highlights, valid move indicators, and game-over overlay.
 */

import { BaseLayer } from './BaseLayer';
import { BoardMetrics } from '../types/canvas';
import { Position, GameState, GameStatus, Side } from '@chess/types';

/**
 * Layer 3: Renders dynamic UI effects above the pieces.
 * Includes animated selection highlight, pulsing valid move indicators, and game-over overlay.
 */
export class AboveEffectsLayer extends BaseLayer {
  readonly zIndex = 3;
  private selectedPosition: Position | null = null;
  private validMoves: Position[] = [];
  private gameState: GameState | null = null;

  /**
   * Update the selected piece position.
   */
  setSelectedPosition(pos: Position | null): void {
    this.selectedPosition = pos;
  }

  /**
   * Update valid moves for display.
   */
  setValidMoves(moves: Position[]): void {
    this.validMoves = moves;
  }

  /**
   * Update game state for game-over detection.
   */
  setGameState(gameState: GameState | null): void {
    this.gameState = gameState;
  }

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    elapsedTime: number,
    _deltaTime: number
  ): void {
    const { padding, cellSize, pieceSize, width, height } = metrics;

    // Selection highlight: animated rotating hexagon with pulsing glow
    if (this.selectedPosition) {
      const x = padding + this.selectedPosition.col * cellSize;
      const y = padding + this.selectedPosition.row * cellSize;
      
      this.drawSelectionHighlight(ctx, x, y, pieceSize, elapsedTime);
    }

    // Valid move indicators: animated pulsing diamonds
    if (this.validMoves.length > 0) {
      for (let i = 0; i < this.validMoves.length; i++) {
        const move = this.validMoves[i];
        const x = padding + move.col * cellSize;
        const y = padding + move.row * cellSize;
        // Offset each indicator's animation phase for wave effect
        this.drawValidMoveIndicator(ctx, x, y, cellSize, elapsedTime, i);
      }
    }

    // Game over overlay
    if (this.gameState?.status === GameStatus.FINISHED) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(cellSize * 0.65)}px KaiTi, STKaiti, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const winner = this.gameState.winner === Side.RED ? '红方胜利!' : '黑方胜利!';
      ctx.fillText(winner, width / 2, height / 2);

      ctx.font = `${Math.round(cellSize * 0.33)}px sans-serif`;
      ctx.fillText('点击重新开始', width / 2, height / 2 + cellSize);
    }
  }

  /**
   * Draw animated selection highlight - rotating hexagon with pulsing glow.
   */
  private drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pieceSize: number,
    elapsedTime: number
  ): void {
    // Pulsing size animation
    const pulseSpeed = 0.003;
    const pulsePhase = Math.sin(elapsedTime * pulseSpeed) * 0.15 + 1; // 0.85 - 1.15
    const baseRadius = pieceSize / 2 + 4;
    const radius = baseRadius * pulsePhase;
    
    // Rotating animation
    const rotationSpeed = 0.001;
    const rotation = elapsedTime * rotationSpeed;
    
    // Color cycling - cyan to magenta
    const colorPhase = (Math.sin(elapsedTime * 0.0015) + 1) / 2; // 0 - 1
    const r = Math.round(0 * (1 - colorPhase) + 255 * colorPhase);
    const g = Math.round(240 * (1 - colorPhase) + 0 * colorPhase);
    const b = Math.round(255 * (1 - colorPhase) + 255 * colorPhase);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Outer glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * pulsePhase;

    // Draw hexagon
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = Math.cos(angle) * radius;
      const hy = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Inner hexagon (smaller, rotating opposite direction)
    ctx.rotate(-rotation * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = Math.cos(angle) * (radius * 0.6);
      const hy = Math.sin(angle) * (radius * 0.6);
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw animated valid move indicator - pulsing diamond with color shift.
   */
  private drawValidMoveIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number,
    elapsedTime: number,
    index: number
  ): void {
    // Each indicator has slightly different phase for wave effect
    const phaseOffset = index * 0.5;
    const pulseSpeed = 0.004;
    const pulsePhase = Math.sin(elapsedTime * pulseSpeed + phaseOffset) * 0.3 + 1; // 0.7 - 1.3
    
    const baseSize = cellSize * 0.12;
    const size = baseSize * pulsePhase;
    
    // Color cycling with phase offset
    const colorSpeed = 0.002;
    const colorPhase = (Math.sin(elapsedTime * colorSpeed + phaseOffset) + 1) / 2;
    const r = Math.round(0 * (1 - colorPhase) + 255 * colorPhase);
    const g = Math.round(255 * (1 - colorPhase) + 100 * colorPhase);
    const b = Math.round(200 * (1 - colorPhase) + 50 * colorPhase);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x, y);

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulsePhase;

    // Outer rotating diamond frame (constant visibility, rotating)
    const rotationSpeed = 0.002;
    const rotation = elapsedTime * rotationSpeed + phaseOffset;
    ctx.save();
    ctx.rotate(rotation);
    
    const outerSize = size * 1.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -outerSize);
    ctx.lineTo(outerSize, 0);
    ctx.lineTo(0, outerSize);
    ctx.lineTo(-outerSize, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Draw diamond shape
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6 * pulsePhase;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();

    // Inner diamond (smaller, brighter)
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8 * pulsePhase;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
