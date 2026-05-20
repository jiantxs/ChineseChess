import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Side,
  Position,
  GameStatus,
  BOARD_ROWS,
  BOARD_COLS,
} from '@chess/types';
import { BoardRenderingKit } from '../canvas/BoardRenderingKit';
import { BoardMetrics } from '../canvas/types/canvas';
import { clientLogger } from '../utils/clientLogger';

/** 默认棋子尺寸（像素）。 */
const PIECE_SIZE = 60;
/** 默认棋盘内边距（像素）。 */
const BOARD_PADDING = 35;
/** 默认格子尺寸（像素）。 */
const CELL_SIZE = 55;

/** 棋盘画布的可配置尺寸。 */
export interface ChessBoardSize {
  width?: number;
  height?: number;
  cellSize?: number;
  padding?: number;
}

/** {@link ChessBoard} 组件的属性。 */
export interface ChessBoardProps {
  id?: string;
  gameState: GameState | null;
  playerSide: Side | null;
  gameMode: 'local' | 'online';
  validMoves?: Position[];
  selectedPosition?: Position | null;
  size?: ChessBoardSize;
  /** 渲染风格名称，如 'cyber'。默认为 'cyber'。 */
  style?: string;
  onCellClick?: (position: Position, hasPiece: boolean) => void;
  onMove?: (from: Position, to: Position) => void;
  onGetValidMoves?: (position: Position) => void;
}

/**
 * 基于画布的中国象棋 (象棋) 棋盘组件，带分层动画系统。
 *
 * 功能：
 * - 分层渲染：背景 → 下方特效 → 棋子 → 上方特效
 * - 支持通过 style 参数切换渲染风格
 * - 动态网格线、星空背景、SVG 棋子图片、选中高亮、有效移动点、游戏结束叠加层
 *
 * @param props - {@link ChessBoardProps}
 * @returns 渲染的 ChessBoard 组件。
 */
export default function ChessBoard({
  id,
  gameState,
  playerSide,
  gameMode,
  validMoves: externalValidMoves,
  selectedPosition: externalSelectedPosition,
  size,
  style: styleName = 'cyber',
  onCellClick,
  onMove,
  onGetValidMoves,
}: ChessBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kitRef = useRef<BoardRenderingKit | null>(null);
  const prevGameStateRef = useRef<GameState | null>(null);
  const effectIdCounter = useRef(0);

  /** 非外部控制时内部选中的棋子位置。 */
  const [internalSelectedPiece, setInternalSelectedPiece] = useState<Position | null>(null);
  /** 非外部控制时内部计算的有效移动。 */
  const [internalValidMoves, setInternalValidMoves] = useState<Position[]>([]);

  /** 有效的选中棋子：外部属性优先于内部状态。 */
  const selectedPiece = externalSelectedPosition ?? internalSelectedPiece;
  /** 有效的有效移动：外部属性优先于内部状态。 */
  const displayValidMoves = externalValidMoves ?? internalValidMoves;
  /** 组件是否处于外部控制模式。 */
  const isExternalMode = externalValidMoves !== undefined || externalSelectedPosition !== undefined;

  const cellSize = size?.cellSize ?? CELL_SIZE;
  const padding = size?.padding ?? BOARD_PADDING;
  const pieceSize = Math.round(cellSize * 1.1);

  const width = size?.width ?? padding * 2 + cellSize * (BOARD_COLS - 1);
  const height = size?.height ?? padding * 2 + cellSize * (BOARD_ROWS - 1);

  /** 构建棋盘度量对象。 */
  const metrics: BoardMetrics = {
    width,
    height,
    cellSize,
    padding,
    pieceSize,
    cols: BOARD_COLS,
    rows: BOARD_ROWS,
  };

  // 初始化时创建 BoardRenderingKit
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 创建渲染套件（风格由 styleName 参数决定）
    clientLogger.info('ChessBoard initializing', { styleName, width: metrics.width, height: metrics.height });
    const kit = new BoardRenderingKit(canvas, metrics, styleName);
    kitRef.current = kit;

    // 启动渲染循环
    kit.start();
    clientLogger.info('ChessBoard render loop started', { styleName });

    // 清理
    return () => {
      clientLogger.info('ChessBoard unmounting', { styleName });
      kit.destroy();
      kitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 维度变化时更新度量
  useEffect(() => {
    if (kitRef.current) {
      kitRef.current.setMetrics(metrics);
    }
  }, [metrics]);

  // 游戏状态变化时更新棋子分层和触发特效
  useEffect(() => {
    if (kitRef.current) {
      kitRef.current.setGameState(gameState);
    }

    // 检测吃子和移动以产生特效
    if (gameState && prevGameStateRef.current && kitRef.current) {
      const prevState = prevGameStateRef.current;

      // 如果有上一步移动则获取它
      let lastMove = null;
      if (gameState.moves.length > prevState.moves.length) {
        lastMove = gameState.moves[gameState.moves.length - 1];
      }

      // 检测吃子（棋子在最后移动目的地消失）
      if (lastMove) {
        const toRow = lastMove.to.row;
        const toCol = lastMove.to.col;
        const prevPieceAtDest = prevState.board[toRow][toCol];

        // 如果目的地有棋子且与移动棋子不同，则是吃子
        if (prevPieceAtDest && prevPieceAtDest.id !== lastMove.piece.id) {
          let x = padding + toCol * cellSize;
          let y = padding + toRow * cellSize;
          const currentMetrics = kitRef.current?.getMetrics?.();
          if (currentMetrics?.projection) {
            const p = currentMetrics.projection.project(currentMetrics, toCol, toRow);
            x = p.x;
            y = p.y;
          }
          effectIdCounter.current++;
          kitRef.current.addCaptureEffect(
            x,
            y,
            prevPieceAtDest.side,
            `cap-${effectIdCounter.current}`
          );
        }

        // 为每步移动添加移动轨迹
        let fromX = padding + lastMove.from.col * cellSize;
        let fromY = padding + lastMove.from.row * cellSize;
        let toX = padding + lastMove.to.col * cellSize;
        let toY = padding + lastMove.to.row * cellSize;
        const currentMetrics = kitRef.current?.getMetrics?.();
        if (currentMetrics?.projection) {
          const pFrom = currentMetrics.projection.project(currentMetrics, lastMove.from.col, lastMove.from.row);
          const pTo = currentMetrics.projection.project(currentMetrics, lastMove.to.col, lastMove.to.row);
          fromX = pFrom.x;
          fromY = pFrom.y;
          toX = pTo.x;
          toY = pTo.y;
        }
        effectIdCounter.current++;
        kitRef.current.addMoveTrail(
          fromX,
          fromY,
          toX,
          toY,
          lastMove.piece.side,
          `trail-${effectIdCounter.current}`
        );
      }
    }

    prevGameStateRef.current = gameState;
  }, [gameState, padding, cellSize]);

  // 选择/有效移动变化时更新上方特效层
  useEffect(() => {
    if (kitRef.current) {
      kitRef.current.setSelectedPosition(selectedPiece);
      kitRef.current.setValidMoves(displayValidMoves);
      kitRef.current.setGameOverState(gameState);
    }
  }, [selectedPiece, displayValidMoves, gameState]);

  /**
   * 将鼠标点击事件转换为棋盘坐标。
   */
  const getPositionFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Position | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 若存在 3D 投影，使用逆投影计算棋盘坐标
    const currentMetrics = kitRef.current?.getMetrics?.();
    if (currentMetrics?.projection) {
      const result = currentMetrics.projection.unproject(currentMetrics, x, y);
      if (!result) return null;
      const col = Math.round(result.col);
      const row = Math.round(result.row);
      if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
        return { row, col };
      }
      return null;
    }

    const col = Math.round((x - padding) / cellSize);
    const row = Math.round((y - padding) / cellSize);

    if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
      return { row, col };
    }

    return null;
  }, [padding, cellSize, metrics]);

  /**
   * 处理画布点击：选中棋子或执行移动。
   */
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || gameState.status === GameStatus.FINISHED) {
      return;
    }

    const pos = getPositionFromEvent(e);
    if (!pos) return;

    const piece = gameState.board[pos.row][pos.col];
    clientLogger.debug('Canvas clicked', { pos, hasPiece: !!piece, gameMode });

    if (onCellClick) {
      onCellClick(pos, !!piece);
      return;
    }

    if (selectedPiece) {
      const isValidMove = displayValidMoves.some(m => m.row === pos.row && m.col === pos.col);

      if (isValidMove) {
        clientLogger.info('Move executed', { from: selectedPiece, to: pos, gameMode });
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
        clientLogger.debug('Piece selected', { pos, pieceType: piece.type, pieceSide: piece.side });
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
