/**
 * @file CommonPiecesLayer - 第2层：棋子渲染 (Common 拟物风格)
 * 渲染所有棋子，使用木制拟物风格SVG图片。
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
        clientLogger.error('Failed to load common piece image', { pieceName: name });
        resolve();
      };
      img.src = assetPath(`/assets/svg/common/${name}.svg`);
      PIECE_IMAGES[name] = img;
    });
  });

  return Promise.all(promises).then(() => {
    imagesLoaded = true;
    clientLogger.info('Common piece images loaded', { pieceCount: pieces.length });
  });
}

/**
 * 返回棋子的图片缓存键。
 */
function getPieceImageName(piece: Piece): string {
  return `${piece.side}-${piece.type}`;
}

/**
 * 第2层：渲染所有棋子。
 * Common风格：简洁写实，无发光特效，无动画。
 */
export class CommonPiecesLayer extends BaseLayer implements PiecesLayerInterface {
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
    _elapsedTime: number,
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

          ctx.save();
          ctx.translate(centerX, centerY);

          // 绘制棋子图片
          const x = -pieceSize / 2;
          const y = -pieceSize / 2;
          const imgName = getPieceImageName(piece);
          const img = PIECE_IMAGES[imgName];
          if (img) {
            ctx.drawImage(img, x, y, pieceSize, pieceSize);
          }

          ctx.restore();
        }
      }
    }
  }
}
