/**
 * @file Cyber3DAboveEffectsLayer - 第3层：3D 透视棋子上方效果
 * 渲染动态选中高亮、有效移动指示器和游戏结束叠加层。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';
import { Position, GameState, GameStatus, Side } from '@chess/types';
import { AboveEffectsLayerInterface } from '../../types';

export class Cyber3DAboveEffectsLayer extends BaseLayer implements AboveEffectsLayerInterface {
  readonly zIndex = 3;
  private selectedPosition: Position | null = null;
  private validMoves: Position[] = [];
  private gameState: GameState | null = null;

  setSelectedPosition(pos: Position | null): void {
    this.selectedPosition = pos;
  }

  setValidMoves(moves: Position[]): void {
    this.validMoves = moves;
  }

  setGameState(gameState: GameState | null): void {
    this.gameState = gameState;
  }

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    elapsedTime: number,
    _deltaTime: number
  ): void {
    const { projection, width, height, cellSize } = metrics;
    if (!projection) return;

    // 选中高亮
    if (this.selectedPosition) {
      const p = projection.project(metrics, this.selectedPosition.col, this.selectedPosition.row);
      const scale = p.scale;
      this.drawSelectionHighlight(ctx, p.x, p.y, cellSize * 1.1 * scale, elapsedTime);
    }

    // 有效移动指示器
    if (this.validMoves.length > 0) {
      for (let i = 0; i < this.validMoves.length; i++) {
        const move = this.validMoves[i];
        const p = projection.project(metrics, move.col, move.row);
        const scale = p.scale;
        this.drawValidMoveIndicator(ctx, p.x, p.y, cellSize * scale, elapsedTime, i);
      }
    }

    // 游戏结束叠加层
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

  private drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pieceSize: number,
    elapsedTime: number
  ): void {
    const pulseSpeed = 0.003;
    const pulsePhase = Math.sin(elapsedTime * pulseSpeed) * 0.15 + 1;
    const baseRadius = pieceSize / 2 + 4;
    const radius = baseRadius * pulsePhase;
    const rotationSpeed = 0.001;
    const rotation = elapsedTime * rotationSpeed;
    const colorPhase = (Math.sin(elapsedTime * 0.0015) + 1) / 2;
    const r = Math.round(0 * (1 - colorPhase) + 255 * colorPhase);
    const g = Math.round(240 * (1 - colorPhase) + 0 * colorPhase);
    const b = Math.round(255 * (1 - colorPhase) + 255 * colorPhase);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * pulsePhase;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = Math.cos(angle) * radius;
      const hy = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.rotate(-rotation * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = Math.cos(angle) * (radius * 0.6);
      const hy = Math.sin(angle) * (radius * 0.6);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawValidMoveIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number,
    elapsedTime: number,
    index: number
  ): void {
    const phaseOffset = index * 0.5;
    const pulseSpeed = 0.004;
    const pulsePhase = Math.sin(elapsedTime * pulseSpeed + phaseOffset) * 0.3 + 1;
    const baseSize = cellSize * 0.12;
    const size = baseSize * pulsePhase;
    const colorSpeed = 0.002;
    const colorPhase = (Math.sin(elapsedTime * colorSpeed + phaseOffset) + 1) / 2;
    const r = Math.round(0 * (1 - colorPhase) + 255 * colorPhase);
    const g = Math.round(255 * (1 - colorPhase) + 100 * colorPhase);
    const b = Math.round(200 * (1 - colorPhase) + 50 * colorPhase);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulsePhase;

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

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6 * pulsePhase;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();

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
