/**
 * @file PiecesLayer - Layer 2: Chess pieces rendering with idle animations
 * Renders all chess pieces with idle effects and Chinese character labels.
 */

import { BaseLayer } from './BaseLayer';
import { BoardMetrics } from '../types/canvas';
import { GameState, Piece, PieceType, Side, BOARD_ROWS, BOARD_COLS } from '@chess/core';

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
 * Get Chinese character label for a piece.
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
 * Get piece glow color based on side.
 */
function getPieceGlowColor(side: Side): string {
  return side === Side.RED ? '#00f0ff' : '#ff00ff';
}

/**
 * Layer 2: Renders all chess pieces with idle animations and Chinese labels.
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
          
          // Calculate idle animation
          const idleAnim = this.calculateIdleAnimation(piece, row, col, elapsedTime);
          
          ctx.save();
          ctx.translate(centerX, centerY);
          
          // Apply scale animation
          ctx.scale(idleAnim.scale, idleAnim.scale);
          
          // Apply rotation animation (subtle)
          ctx.rotate(idleAnim.rotation);
          
          // Draw glow effect
          this.drawPieceGlow(ctx, piece, pieceSize, idleAnim.glowIntensity);
          
          // Draw piece image
          const x = -pieceSize / 2;
          const y = -pieceSize / 2;
          const imgName = getPieceImageName(piece);
          const img = PIECE_IMAGES[imgName];
          if (img) {
            ctx.drawImage(img, x, y, pieceSize, pieceSize);
          }
          
          // Draw Chinese character label (fixed position, not floating)
          this.drawPieceLabel(ctx, piece, pieceSize);
          
          ctx.restore();
        }
      }
    }
  }

  /**
   * Calculate idle animation parameters for a piece.
   */
  private calculateIdleAnimation(
    piece: Piece,
    row: number,
    col: number,
    elapsedTime: number
  ): { scale: number; rotation: number; glowIntensity: number } {
    // Unique phase for each piece based on position
    const phase = (row * BOARD_COLS + col) * 0.7;
    
    // Breathing scale animation
    const breatheSpeed = 0.002;
    const breathePhase = Math.sin(elapsedTime * breatheSpeed + phase);
    const scale = 1 + breathePhase * 0.03; // 0.97 - 1.03
    
    // Very subtle rotation (tilt)
    const tiltSpeed = 0.001;
    const rotation = Math.sin(elapsedTime * tiltSpeed + phase) * 0.02; // ±0.02 rad
    
    // Pulsing glow
    const glowSpeed = 0.003;
    const glowPhase = (Math.sin(elapsedTime * glowSpeed + phase) + 1) / 2;
    const glowIntensity = 0.3 + glowPhase * 0.7; // 0.3 - 1.0
    
    // General has more prominent animation
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
   * Draw glow effect behind piece.
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
   * Draw Chinese character label for a piece.
   * Fixed position at center of piece, large and clear.
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
    
    // Large font size - 45% of piece size
    const fontSize = Math.round(pieceSize * 0.45);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "SimHei", "Noto Sans SC", sans-serif`;
    
    // White text with glow for visibility
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = getPieceGlowColor(piece.side);
    ctx.shadowBlur = 8;
    
    // Draw at center of piece
    ctx.fillText(label, 0, 0);
    
    ctx.restore();
  }
}
