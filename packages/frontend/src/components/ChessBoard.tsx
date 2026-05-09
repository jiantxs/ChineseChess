import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Piece,
  Side,
  Position,
  GameStatus,
  BOARD_ROWS,
  BOARD_COLS,
} from '@chess/core';

/** Default piece size in pixels. */
const PIECE_SIZE = 60;
/** Default board padding in pixels. */
const BOARD_PADDING = 35;
/** Default cell size in pixels. */
const CELL_SIZE = 55;

/** In-memory cache of loaded piece SVG images, keyed by `{side}-{type}`. */
const PIECE_IMAGES: Record<string, HTMLImageElement> = {};
/** Whether all piece images have been loaded. */
let imagesLoaded = false;

/** Cached board SVG image. */
let boardImage: HTMLImageElement | null = null;
/** Whether board image has been loaded. */
let boardImageLoaded = false;

/**
 * Asynchronously loads all piece SVG images into {@link PIECE_IMAGES}.
 *
 * @returns A promise that resolves once all images are loaded (or failed).
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
 * Loads the board SVG image into {@link boardImage}.
 *
 * @returns A promise that resolves once the image is loaded (or failed).
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
 * Returns the image cache key for a given piece.
 *
 * @param piece - The piece to look up.
 * @returns The image name in `{side}-{type}` format.
 */
function getPieceImageName(piece: Piece): string {
  return `${piece.side}-${piece.type}`;
}

/** Configurable dimensions for the chess board canvas. */
export interface ChessBoardSize {
  width?: number;
  height?: number;
  cellSize?: number;
  padding?: number;
}

/** Props for the {@link ChessBoard} component. */
export interface ChessBoardProps {
  id?: string;
  gameState: GameState | null;
  playerSide: Side | null;
  gameMode: 'local' | 'online';
  validMoves?: Position[];
  selectedPosition?: Position | null;
  size?: ChessBoardSize;
  onCellClick?: (position: Position, hasPiece: boolean) => void;
  onMove?: (from: Position, to: Position) => void;
  onGetValidMoves?: (position: Position) => void;
}

/**
 * Canvas-based Chinese Chess (Xiangqi) board component.
 *
 * Renders a 10x9 board with grid lines, palace markings, river labels,
 * SVG piece images, selection highlights, valid-move dots, and a game-over overlay.
 *
 * @param props - {@link ChessBoardProps}
 * @returns The rendered ChessBoard component.
 */
export default function ChessBoard({
  id,
  gameState,
  playerSide,
  gameMode,
  validMoves: externalValidMoves,
  selectedPosition: externalSelectedPosition,
  size,
  onCellClick,
  onMove,
  onGetValidMoves,
}: ChessBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Internally selected piece position when not controlled externally. */
  const [internalSelectedPiece, setInternalSelectedPiece] = useState<Position | null>(null);
  /** Internally computed valid moves when not controlled externally. */
  const [internalValidMoves, setInternalValidMoves] = useState<Position[]>([]);
  /** Whether piece SVG images are ready for rendering. */
  const [imagesReady, setImagesReady] = useState(false);
  /** Whether board SVG image is ready for rendering. */
  const [boardReady, setBoardReady] = useState(false);

  /** Effective selected piece: external prop takes precedence over internal state. */
  const selectedPiece = externalSelectedPosition ?? internalSelectedPiece;
  /** Effective valid moves: external prop takes precedence over internal state. */
  const displayValidMoves = externalValidMoves ?? internalValidMoves;
  /** Whether the component is operating in external-controlled mode. */
  const isExternalMode = externalValidMoves !== undefined || externalSelectedPosition !== undefined;

  const cellSize = size?.cellSize ?? CELL_SIZE;
  const padding = size?.padding ?? BOARD_PADDING;
  const pieceSize = Math.round(cellSize * 1.1);

  const width = size?.width ?? padding * 2 + cellSize * (BOARD_COLS - 1);
  const height = size?.height ?? padding * 2 + cellSize * (BOARD_ROWS - 1);

  // Load piece images and board image on mount.
  useEffect(() => {
    Promise.all([
      loadPieceImages(),
      loadBoardImage(),
    ]).then(() => {
      setImagesReady(true);
      setBoardReady(true);
    });
  }, []);

  /**
   * Draws the full board state onto the canvas.
   *
   * Includes background, grid lines, palace X-markings, river text,
   * piece images, selection highlight, valid-move dots, and game-over overlay.
   */
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesReady) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw board background from SVG
    if (boardImage && boardReady) {
      ctx.drawImage(boardImage, 0, 0, width, height);
    } else {
      // Fallback background if SVG not loaded
      ctx.fillStyle = '#f4e4c1';
      ctx.fillRect(0, 0, width, height);
    }

    // Render pieces from gameState.board
    if (gameState?.board) {
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const piece = gameState.board[row][col];
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

    // Selection highlight: gold circle around the selected piece
    if (selectedPiece) {
      const x = padding + selectedPiece.col * cellSize;
      const y = padding + selectedPiece.row * cellSize;

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, pieceSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, pieceSize / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Valid move dots: green circles on reachable squares
    if (displayValidMoves.length > 0) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
      for (const move of displayValidMoves) {
        const x = padding + move.col * cellSize;
        const y = padding + move.row * cellSize;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Game over overlay: semi-transparent screen with winner announcement
    if (gameState?.status === GameStatus.FINISHED) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(cellSize * 0.65)}px KaiTi, STKaiti, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const winner = gameState.winner === Side.RED ? '红方胜利!' : '黑方胜利!';
      ctx.fillText(winner, width / 2, height / 2);

      ctx.font = `${Math.round(cellSize * 0.33)}px sans-serif`;
      ctx.fillText('点击重新开始', width / 2, height / 2 + cellSize);
    }
  }, [gameState, selectedPiece, displayValidMoves, imagesReady, boardReady, width, height, cellSize, padding, pieceSize]);

  // Redraw the board whenever drawBoard dependencies change.
  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  /**
   * Converts a mouse click event to board coordinates.
   *
   * @param e - The React mouse event from the canvas.
   * @returns The corresponding board {@link Position} or null if outside the board.
   */
  const getPositionFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Position | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.round((x - padding) / cellSize);
    const row = Math.round((y - padding) / cellSize);

    if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
      return { row, col };
    }

    return null;
  }, [padding, cellSize]);

  /**
   * Handles canvas clicks: selects a piece or executes a move.
   *
   * If an external `onCellClick` handler is provided, it delegates to that.
   * Otherwise, it manages internal selection state and invokes `onMove` / `onGetValidMoves`.
   *
   * @param e - The React mouse event from the canvas.
   */
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || gameState.status === GameStatus.FINISHED) {
      return;
    }

    const pos = getPositionFromEvent(e);
    if (!pos) return;

    const piece = gameState.board[pos.row][pos.col];

    if (onCellClick) {
      onCellClick(pos, !!piece);
      return;
    }

    if (selectedPiece) {
      const isValidMove = displayValidMoves.some(m => m.row === pos.row && m.col === pos.col);

      if (isValidMove) {
        onMove?.(selectedPiece, pos);
        setInternalSelectedPiece(null);
        if (!isExternalMode) {
          setInternalValidMoves([]);
        }
        return;
      }
    }

    if (piece) {
      const isMyTurn = gameState.currentTurn === piece.side;
      const canControl = gameMode === 'local' || playerSide === piece.side;

      if (isMyTurn && canControl) {
        setInternalSelectedPiece(pos);
        if (onGetValidMoves) {
          onGetValidMoves(pos);
        } else {
          setInternalValidMoves([]);
        }
      } else {
        setInternalSelectedPiece(null);
        if (!isExternalMode) {
          setInternalValidMoves([]);
        }
      }
    } else {
      setInternalSelectedPiece(null);
      if (!isExternalMode) {
        setInternalValidMoves([]);
      }
    }
  }, [gameState, selectedPiece, displayValidMoves, isExternalMode, gameMode, playerSide, onGetValidMoves, onMove, onCellClick, getPositionFromEvent]);

  return (
    <div className="chess-board" id={id}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
      />
    </div>
  );
}
