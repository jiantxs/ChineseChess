/**
 * @file CyberPiecesLayer - 第2层：带空闲动画的棋子渲染 (Cyber 风格)
 * 渲染所有棋子的空闲效果和中文字符标签。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';
import { GameState, Piece, PieceType, Side, BOARD_ROWS, BOARD_COLS } from '@chess/types';
import { clientLogger } from '../../../../utils/clientLogger';
import { PiecesLayerInterface } from '../../types';

/** 已加载棋子 SVG 图片的内存缓存 */
const PIECE_IMAGES: Record<string, HTMLImageElement> = {};
let imagesLoaded = false;

/**
 * 加载所有棋子 SVG 图片。
 * @returns 所有图片加载完成时解析的 Promise
 */
function loadPieceImages(): Promise<void> {
  if (imagesLoaded) return Promise.resolve();

  const pieces = [
    'red-general', 'red-advisor', 'red-elephant', 'red-horse',
    'red-chariot', 'red-cannon', 'red-soldier',
    'black-general', 'black-advisor', 'black-elephant', 'black-horse',
    'black-chariot', 'black-cannon', 'black-soldier'
  ];

  const promises = pieces.map(name => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        clientLogger.error('Failed to load piece image', { pieceName: name });
        resolve();
      };
      img.src = `./assets/svg/cyber/${name}.svg`;
      PIECE_IMAGES[name] = img;
    });
  });

  return Promise.all(promises).then(() => {
    imagesLoaded = true;
  });
}

/**
 * 返回棋子的图片缓存键。
 */
function getPieceImageName(piece: Piece): string {
  return `${piece.side}-${piece.type}`;
}

/**
 * 获取棋子的中文字符标签。
 */
function getPieceLabel(piece: Piece): string {
  const labels: Record<string, Record<string, string>> = {
    red: {
      general: '帅',
      advisor: '仕',
      elephant: '相',
      horse: '傌',
      chariot: '俥',
      cannon: '炮',
      soldier: '兵',
    },
    black: {
      general: '将',
      advisor: '士',
      elephant: '象',
      horse: '馬',
      chariot: '車',
      cannon: '砲',
      soldier: '卒',
    },
  };
  return labels[piece.side]?.[piece.type] || '';
}

/**
 * 根据棋子阵营获取棋子发光颜色。
 */
function getPieceGlowColor(side: Side): string {
  return side === Side.RED ? '#00f0ff' : '#ff00ff';
}

/**
 * 第2层：渲染所有带空闲动画和中文字标签的棋子。
 */
export class CyberPiecesLayer extends BaseLayer implements PiecesLayerInterface {
  readonly zIndex = 2;
  private imagesReady: boolean = false;
  private gameState: GameState | null = null;

  constructor() {
    super();
    loadPieceImages().then(() => {
      this.imagesReady = true;
    });
  }

  /**
   * 更新要渲染的游戏状态。
   * @param gameState - 当前游戏状态
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
    if (!this.imagesReady || !this.gameState?.board) return;

    const { padding, cellSize, pieceSize } = metrics;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const piece = this.gameState.board[row][col];
        if (piece) {
          const centerX = padding + col * cellSize;
          const centerY = padding + row * cellSize;

          // 计算空闲动画
          const idleAnim = this.calculateIdleAnimation(piece, row, col, elapsedTime);

          ctx.save();
          ctx.translate(centerX, centerY);

          // 应用缩放动画
          ctx.scale(idleAnim.scale, idleAnim.scale);

          // 应用旋转动画（微妙）
          ctx.rotate(idleAnim.rotation);

          // 绘制发光效果
          this.drawPieceGlow(ctx, piece, pieceSize, idleAnim.glowIntensity);

          // 绘制棋子图片
          const x = -pieceSize / 2;
          const y = -pieceSize / 2;
          const imgName = getPieceImageName(piece);
          const img = PIECE_IMAGES[imgName];
          if (img) {
            ctx.drawImage(img, x, y, pieceSize, pieceSize);
          }

          // 绘制中文字符标签（固定位置，不浮动）
          this.drawPieceLabel(ctx, piece, pieceSize);

          ctx.restore();
        }
      }
    }
  }

  /**
   * 计算棋子的空闲动画参数。
   */
  private calculateIdleAnimation(
    piece: Piece,
    row: number,
    col: number,
    elapsedTime: number
  ): { scale: number; rotation: number; glowIntensity: number } {
    // 基于位置的每个棋子的独特相位
    const phase = (row * BOARD_COLS + col) * 0.7;

    // 呼吸缩放动画
    const breatheSpeed = 0.002;
    const breathePhase = Math.sin(elapsedTime * breatheSpeed + phase);
    const scale = 1 + breathePhase * 0.03; // 0.97 - 1.03

    // 非常微妙的旋转（倾斜）
    const tiltSpeed = 0.001;
    const rotation = Math.sin(elapsedTime * tiltSpeed + phase) * 0.02; // ±0.02 rad

    // 脉冲发光
    const glowSpeed = 0.003;
    const glowPhase = (Math.sin(elapsedTime * glowSpeed + phase) + 1) / 2;
    const glowIntensity = 0.3 + glowPhase * 0.7; // 0.3 - 1.0

    // 将军有更突出的动画
    if (piece.type === PieceType.GENERAL) {
      return {
        scale: 1 + breathePhase * 0.05,
        rotation: Math.sin(elapsedTime * tiltSpeed + phase) * 0.03,
        glowIntensity: 0.5 + glowPhase * 0.5,
      };
    }

    return { scale, rotation, glowIntensity };
  }

  /**
   * 在棋子后方绘制发光效果。
   */
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

  /**
   * 绘制棋子的中文字符标签。
   * 固定位置在棋子中心，大而清晰。
   */
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

    // 大字体 - 棋子大小的 45%
    const fontSize = Math.round(pieceSize * 0.45);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "SimHei", "Noto Sans SC", sans-serif`;

    // 带发光效果的白色文字以提高可见性
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = getPieceGlowColor(piece.side);
    ctx.shadowBlur = 8;

    // 在棋子中心绘制
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
}
