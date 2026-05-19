/**
 * @file Cyber3DPiecesLayer - 第2层：带 3D 透视的棋子渲染
 * 棋子按透视投影位置和缩放绘制，近大远小。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';
import { GameState, Piece, PieceType, Side, BOARD_ROWS, BOARD_COLS } from '@chess/types';
import { clientLogger } from '../../../../utils/clientLogger';
import { assetPath } from '../../../../utils/api';
import { PiecesLayerInterface } from '../../types';

/** 已加载棋子 SVG 图片的内存缓存 */
const PIECE_IMAGES: Record<string, HTMLImageElement> = {};
let imagesLoaded = false;

function loadPieceImages(): Promise<void> {
  if (imagesLoaded) return Promise.resolve();
  const pieces = [
    'red-general', 'red-advisor', 'red-elephant', 'red-horse',
    'red-chariot', 'red-cannon', 'red-soldier',
    'black-general', 'black-advisor', 'black-elephant', 'black-horse',
    'black-chariot', 'black-cannon', 'black-soldier',
  ];
  const promises = pieces.map(name => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        clientLogger.error('Failed to load piece image', { pieceName: name });
        resolve();
      };
      img.src = assetPath(`/assets/svg/cyber/${name}.svg`);
      PIECE_IMAGES[name] = img;
    });
  });
  return Promise.all(promises).then(() => { imagesLoaded = true; });
}

function getPieceImageName(piece: Piece): string {
  return `${piece.side}-${piece.type}`;
}

function getPieceLabel(piece: Piece): string {
  const labels: Record<string, Record<string, string>> = {
    red: { general: '帅', advisor: '仕', elephant: '相', horse: '傌', chariot: '俥', cannon: '炮', soldier: '兵' },
    black: { general: '将', advisor: '士', elephant: '象', horse: '馬', chariot: '車', cannon: '砲', soldier: '卒' },
  };
  return labels[piece.side]?.[piece.type] || '';
}

function getPieceGlowColor(side: Side): string {
  return side === Side.RED ? '#00f0ff' : '#ff00ff';
}

export class Cyber3DPiecesLayer extends BaseLayer implements PiecesLayerInterface {
  readonly zIndex = 2;
  private imagesReady: boolean = false;
  private gameState: GameState | null = null;

  constructor() {
    super();
    loadPieceImages().then(() => { this.imagesReady = true; });
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
    if (!this.imagesReady || !this.gameState?.board) return;
    const { projection, pieceSize } = metrics;
    if (!projection) return;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const piece = this.gameState.board[row][col];
        if (!piece) continue;

        const proj = projection.project(metrics, col, row);
        const centerX = proj.x;
        const centerY = proj.y;
        const perspectiveScale = proj.scale;

        const idleAnim = this.calculateIdleAnimation(piece, row, col, elapsedTime);
        const totalScale = idleAnim.scale * perspectiveScale;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(totalScale, totalScale);
        ctx.rotate(idleAnim.rotation);

        this.drawPieceGlow(ctx, piece, pieceSize, idleAnim.glowIntensity);

        const x = -pieceSize / 2;
        const y = -pieceSize / 2;
        const imgName = getPieceImageName(piece);
        const img = PIECE_IMAGES[imgName];
        if (img) {
          ctx.drawImage(img, x, y, pieceSize, pieceSize);
        }

        this.drawPieceLabel(ctx, piece, pieceSize);
        ctx.restore();
      }
    }
  }

  private calculateIdleAnimation(
    piece: Piece,
    row: number,
    col: number,
    elapsedTime: number
  ): { scale: number; rotation: number; glowIntensity: number } {
    const phase = (row * BOARD_COLS + col) * 0.7;
    const breathePhase = Math.sin(elapsedTime * 0.002 + phase);
    const scale = 1 + breathePhase * 0.03;
    const rotation = Math.sin(elapsedTime * 0.001 + phase) * 0.02;
    const glowPhase = (Math.sin(elapsedTime * 0.003 + phase) + 1) / 2;
    const glowIntensity = 0.3 + glowPhase * 0.7;

    if (piece.type === PieceType.GENERAL) {
      return {
        scale: 1 + breathePhase * 0.05,
        rotation: Math.sin(elapsedTime * 0.001 + phase) * 0.03,
        glowIntensity: 0.5 + glowPhase * 0.5,
      };
    }
    return { scale, rotation, glowIntensity };
  }

  private drawPieceGlow(
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    pieceSize: number,
    intensity: number
  ): void {
    const glowColor = getPieceGlowColor(piece.side);
    const radius = pieceSize / 2;
    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8 * intensity;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPieceLabel(
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    pieceSize: number
  ): void {
    const label = getPieceLabel(piece);
    if (!label) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.round(pieceSize * 0.45);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "SimHei", "Noto Sans SC", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = getPieceGlowColor(piece.side);
    ctx.shadowBlur = 8;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}
