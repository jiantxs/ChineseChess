/**
 * @file AboveEffectsLayer - 第3层：棋子上方渲染的效果
 * 渲染动态选中高亮、有效移动指示器和游戏结束叠加层。
 */

import { BaseLayer } from './BaseLayer';
import { BoardMetrics } from '../types/canvas';
import { Position, GameState, GameStatus, Side } from '@chess/types';

/**
 * 第3层：在棋子上方渲染动态 UI 效果。
 * 包括动画选中高亮、脉冲有效移动指示器和游戏结束叠加层。
 */
export class AboveEffectsLayer extends BaseLayer {
  readonly zIndex = 3;
  private selectedPosition: Position | null = null;
  private validMoves: Position[] = [];
  private gameState: GameState | null = null;

  /**
   * 更新选中的棋子位置。
   */
  setSelectedPosition(pos: Position | null): void {
    this.selectedPosition = pos;
  }

  /**
   * 更新显示的有效移动。
   */
  setValidMoves(moves: Position[]): void {
    this.validMoves = moves;
  }

  /**
   * 更新游戏状态以检测游戏结束。
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

    // 选中高亮：带脉冲发光的动画旋转六边形
    if (this.selectedPosition) {
      const x = padding + this.selectedPosition.col * cellSize;
      const y = padding + this.selectedPosition.row * cellSize;
      
      this.drawSelectionHighlight(ctx, x, y, pieceSize, elapsedTime);
    }

    // 有效移动指示器：动画脉冲菱形
    if (this.validMoves.length > 0) {
      for (let i = 0; i < this.validMoves.length; i++) {
        const move = this.validMoves[i];
        const x = padding + move.col * cellSize;
        const y = padding + move.row * cellSize;
        // 为每个指示器的动画相位设置偏移以产生波动效果
        this.drawValidMoveIndicator(ctx, x, y, cellSize, elapsedTime, i);
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

  /**
   * 绘制动画选中高亮 - 带脉冲发光的旋转六边形。
   */
  private drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pieceSize: number,
    elapsedTime: number
  ): void {
    // 脉冲大小动画
    const pulseSpeed = 0.003;
    const pulsePhase = Math.sin(elapsedTime * pulseSpeed) * 0.15 + 1; // 0.85 - 1.15
    const baseRadius = pieceSize / 2 + 4;
    const radius = baseRadius * pulsePhase;
    
    // 旋转动画
    const rotationSpeed = 0.001;
    const rotation = elapsedTime * rotationSpeed;
    
    // 颜色循环 - 青色到品红
    const colorPhase = (Math.sin(elapsedTime * 0.0015) + 1) / 2; // 0 - 1
    const r = Math.round(0 * (1 - colorPhase) + 255 * colorPhase);
    const g = Math.round(240 * (1 - colorPhase) + 0 * colorPhase);
    const b = Math.round(255 * (1 - colorPhase) + 255 * colorPhase);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // 外部发光效果
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

    // 内部六边形（较小，向相反方向旋转）
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
   * 绘制动画有效移动指示器 - 带颜色变化的脉冲菱形。
   */
  private drawValidMoveIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number,
    elapsedTime: number,
    index: number
  ): void {
    // 每个指示器有略微不同的相位以产生波动效果
    const phaseOffset = index * 0.5;
    const pulseSpeed = 0.004;
    const pulsePhase = Math.sin(elapsedTime * pulseSpeed + phaseOffset) * 0.3 + 1; // 0.7 - 1.3
    
    const baseSize = cellSize * 0.12;
    const size = baseSize * pulsePhase;
    
    // 带相位偏移的颜色循环
    const colorSpeed = 0.002;
    const colorPhase = (Math.sin(elapsedTime * colorSpeed + phaseOffset) + 1) / 2;
    const r = Math.round(0 * (1 - colorPhase) + 255 * colorPhase);
    const g = Math.round(255 * (1 - colorPhase) + 100 * colorPhase);
    const b = Math.round(200 * (1 - colorPhase) + 50 * colorPhase);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x, y);

    // 发光效果
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulsePhase;

    // 外部旋转菱形框架（恒定可见性，旋转）
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

    // 内部菱形（较小，更亮）
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
