/**
 * @file PiecesLayer - Layer 2: Chess pieces rendering
 * Renders all chess pieces from game state.
 */

import { BaseLayer } from './BaseLayer';
import { BoardMetrics } from '../types/canvas';
import { GameState, Piece, BOARD_ROWS, BOARD_COLS } from '@chess/core';

/** In-memory cache of loaded piece SVG images */
const PIECE_IMAGES: Record<string, HTMLImageElement> = {};
let imagesLoaded = false;

/**
 * Loads all piece SVG images.
 * @returns Promise that resolves when all images are loaded
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
        console.error(`Failed to load piece image: ${name}`);
        resolve();
      };
      img.src = `./assets/svg/${name}.svg`;
      PIECE_IMAGES[name] = img;
    });
  });

  return Promise.all(promises).then(() => {
    imagesLoaded = true;
  });
}

/**
 * Returns the image cache key for a piece.
 */
function getPieceImageName(piece: Piece): string {
  return `${piece.side}-${piece.type}`;
}

/**
 * Layer 2: Renders all chess pieces from the current game state.
 */
export class PiecesLayer extends BaseLayer {
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
   * Update the game state to render.
   * @param gameState - Current game state
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
          const x = padding + col * cellSize - pieceSize / 2;
          const y = padding + row * cellSize - pieceSize / 2;
          const imgName = getPieceImageName(piece);
          const img = PIECE_IMAGES[imgName];
          if (img) {
            ctx.drawImage(img, x, y, pieceSize, pieceSize);
          }
        }
      }
    }
  }
}
