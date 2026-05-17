import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Side,
  Position,
  GameStatus,
  BOARD_ROWS,
  BOARD_COLS,
} from '@chess/types';
import { LayeredRenderer } from '../canvas/renderer/LayeredRenderer';
import { BoardLayer } from '../canvas/layers/BoardLayer';
import { BelowEffectsLayer } from '../canvas/layers/BelowEffectsLayer';
import { PiecesLayer } from '../canvas/layers/PiecesLayer';
import { AboveEffectsLayer } from '../canvas/layers/AboveEffectsLayer';
import { AnimationEngine } from '../canvas/animations/AnimationEngine';
import { GridLinesEffect } from '../canvas/effects/GridLinesEffect';
import { StarfieldEffect } from '../canvas/effects/StarfieldEffect';
import { CaptureEffect } from '../canvas/effects/CaptureEffect';
import { MoveTrail } from '../canvas/effects/MoveTrail';
import { BoardMetrics } from '../canvas/types/canvas';

/** Default piece size in pixels. */
const PIECE_SIZE = 60;
/** Default board padding in pixels. */
const BOARD_PADDING = 35;
/** Default cell size in pixels. */
const CELL_SIZE = 55;

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
 * Canvas-based Chinese Chess (Xiangqi) board component with layered animation system.
 *
 * Features:
 * - Layered rendering: background → below-effects → pieces → above-effects
 * - Animated grid lines with flowing light effect
 * - Animated starfield background
 * - SVG piece images, selection highlights, valid-move dots, game-over overlay
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
  const rendererRef = useRef<LayeredRenderer | null>(null);
  const animEngineRef = useRef<AnimationEngine | null>(null);
  const piecesLayerRef = useRef<PiecesLayer | null>(null);
  const aboveLayerRef = useRef<AboveEffectsLayer | null>(null);
  const prevGameStateRef = useRef<GameState | null>(null);
  const effectIdCounter = useRef(0);

  /** Internally selected piece position when not controlled externally. */
  const [internalSelectedPiece, setInternalSelectedPiece] = useState<Position | null>(null);
  /** Internally computed valid moves when not controlled externally. */
  const [internalValidMoves, setInternalValidMoves] = useState<Position[]>([]);

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

  /** Build board metrics object. */
  const metrics: BoardMetrics = {
    width,
    height,
    cellSize,
    padding,
    pieceSize,
    cols: BOARD_COLS,
    rows: BOARD_ROWS,
  };

  // Initialize layered renderer on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create animation engine
    const animEngine = new AnimationEngine();
    animEngineRef.current = animEngine;

    // Create renderer (pass shared animation engine)
    const renderer = new LayeredRenderer(canvas, metrics, animEngine);
    rendererRef.current = renderer;

    // Create layers
    const boardLayer = new BoardLayer();
    const belowEffectsLayer = new BelowEffectsLayer(animEngine);
    const piecesLayer = new PiecesLayer();
    const aboveEffectsLayer = new AboveEffectsLayer();

    piecesLayerRef.current = piecesLayer;
    aboveLayerRef.current = aboveEffectsLayer;

    // Add layers in order (z-index sorted automatically)
    renderer.addLayer(boardLayer);
    renderer.addLayer(belowEffectsLayer);
    renderer.addLayer(piecesLayer);
    renderer.addLayer(aboveEffectsLayer);

    // Add background animations
    animEngine.add(new GridLinesEffect());
    animEngine.add(new StarfieldEffect());

    // Start rendering loop
    renderer.start();

    // Cleanup
    return () => {
      renderer.destroy();
      rendererRef.current = null;
      animEngineRef.current = null;
      piecesLayerRef.current = null;
      aboveLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update metrics when dimensions change
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setMetrics(metrics);
    }
  }, [metrics]);

  // Update pieces layer when game state changes
  useEffect(() => {
    if (piecesLayerRef.current) {
      piecesLayerRef.current.setGameState(gameState);
    }

    // Detect captures and moves for effects
    if (gameState && prevGameStateRef.current && animEngineRef.current) {
      const prevState = prevGameStateRef.current;
      
      // Get last move if available
      let lastMove = null;
      if (gameState.moves.length > prevState.moves.length) {
        lastMove = gameState.moves[gameState.moves.length - 1];
      }
      
      // Check for captures (piece disappeared at destination of last move)
      if (lastMove) {
        const toRow = lastMove.to.row;
        const toCol = lastMove.to.col;
        const prevPieceAtDest = prevState.board[toRow][toCol];
        
        // If there was a piece at destination and it's different from the moving piece, it's a capture
        if (prevPieceAtDest && prevPieceAtDest.id !== lastMove.piece.id) {
          const x = padding + toCol * cellSize;
          const y = padding + toRow * cellSize;
          effectIdCounter.current++;
          animEngineRef.current.add(
            new CaptureEffect(x, y, prevPieceAtDest.side, `cap-${effectIdCounter.current}`)
          );
        }
        
        // Add move trail for every move
        const fromX = padding + lastMove.from.col * cellSize;
        const fromY = padding + lastMove.from.row * cellSize;
        const toX = padding + lastMove.to.col * cellSize;
        const toY = padding + lastMove.to.row * cellSize;
        effectIdCounter.current++;
        animEngineRef.current.add(
          new MoveTrail(fromX, fromY, toX, toY, lastMove.piece.side, `trail-${effectIdCounter.current}`)
        );
      }
    }

    prevGameStateRef.current = gameState;
  }, [gameState, padding, cellSize]);

  // Update above-effects layer when selection/validMoves change
  useEffect(() => {
    if (aboveLayerRef.current) {
      aboveLayerRef.current.setSelectedPosition(selectedPiece);
      aboveLayerRef.current.setValidMoves(displayValidMoves);
      aboveLayerRef.current.setGameState(gameState);
    }
  }, [selectedPiece, displayValidMoves, gameState]);

  /**
   * Converts a mouse click event to board coordinates.
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
