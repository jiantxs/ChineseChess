/**
 * @file CommonAboveEffectsLayer - 第3层：棋子上方渲染的效果 (Common 拟物风格)
 * 渲染选中高亮、有效移动指示器和游戏结束叠加层。
 * 风格：简洁写实，无霓虹发光，无旋转动画。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';
import { Position, GameState, GameStatus, Side } from '@chess/types';
import { AboveEffectsLayerInterface } from '../../types';

/**
 * 第3层：在棋子上方渲染动态 UI 效果。
 * Common风格：简洁的选中框和圆点指示器。
 */
export class CommonAboveEffectsLayer extends BaseLayer implements AboveEffectsLayerInterface {
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
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    const { padding, cellSize, pieceSize, width, height } = metrics;

    // 选中高亮：简洁的方形边框
    if (this.selectedPosition) {
      const x = padding + this.selectedPosition.col * cellSize;
      const y = padding + this.selectedPosition.row * cellSize;

      this.drawSelectionHighlight(ctx, x, y, pieceSize);
    }

    // 有效移动指示器：小圆点
    if (this.validMoves.length > 0) {
      for (const move of this.validMoves) {
        const x = padding + move.col * cellSize;
        const y = padding + move.row * cellSize;
        this.drawValidMoveIndicator(ctx, x, y, cellSize);
      }
    }

    // 游戏结束叠加层
    if (this.gameState?.status === GameStatus.FINISHED) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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
   * 绘制选中高亮 - 简洁的方形边框。
   */
  private drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pieceSize: number
  ): void {
    const halfSize = pieceSize / 2 + 4;

    ctx.save();
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2.5;

    // 绘制方形边框
    ctx.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);

    // 内部浅色边框
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - halfSize + 3, y - halfSize + 3, halfSize * 2 - 6, halfSize * 2 - 6);

    ctx.restore();
  }

  /**
   * 绘制有效移动指示器 - 小圆点。
   */
  private drawValidMoveIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number
  ): void {
    const radius = cellSize * 0.12;

    ctx.save();

    // 实心圆点
    ctx.fillStyle = 'rgba(139, 90, 43, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 内部小圆点
    ctx.fillStyle = 'rgba(139, 90, 43, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
