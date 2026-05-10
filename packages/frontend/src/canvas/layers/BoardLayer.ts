/**
 * @file BoardLayer - Layer 0: Board background
 * Renders the static chess board background.
 */

import { BaseLayer } from './BaseLayer';
import { BoardMetrics } from '../types/canvas';

/** Cached board SVG image */
let boardImage: HTMLImageElement | null = null;
let boardImageLoaded = false;

/**
 * Loads the board SVG image.
 * @returns Promise that resolves when image is loaded
 */
function loadBoardImage(): Promise<void> {
  if (boardImageLoaded) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      boardImage = img;
      boardImageLoaded = true;
      resolve();
    };
    img.onerror = () => {
      console.error('Failed to load board image');
      resolve();
    };
    img.src = './assets/svg/board.svg';
  });
}

/**
 * Layer 0: Renders the chess board background.
 * Uses SVG image if available, otherwise falls back to solid color.
 */
export class BoardLayer extends BaseLayer {
  readonly zIndex = 0;
  private imageReady: boolean = false;

  constructor() {
    super();
    loadBoardImage().then(() => {
      this.imageReady = true;
    });
  }

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    if (boardImage && this.imageReady) {
      ctx.drawImage(boardImage, 0, 0, metrics.width, metrics.height);
    } else {
      // Fallback: black background (as per user's new board design)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, metrics.width, metrics.height);
    }
  }
}
