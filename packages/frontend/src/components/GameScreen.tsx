import { useState, useCallback } from 'react';
import ChessBoard, { ChessBoardSize } from './ChessBoard';
import { GameState, Side, Position, GameStatus, PieceType } from '@chess/types';
import { StatusBadge, ErrorMessage } from './common';
import './GameScreen.css';

export interface GameScreenProps {
  gameMode: 'local' | 'online' | 'ai';
  gameState: GameState | null;
  playerSide: Side | null;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  validMoves: Position[];
  selectedPosition: Position | null;
  boardSize: ChessBoardSize;
  boardStyle?: string;
  onBoardClick: (pos: Position, hasPiece: boolean) => void;
  onReset: () => void;
  error?: string | null;
}

const PIECE_CHAR: Record<PieceType, string> = {
  [PieceType.GENERAL]: '将',
  [PieceType.ADVISOR]: '士',
  [PieceType.ELEPHANT]: '象',
  [PieceType.HORSE]: '马',
  [PieceType.CHARIOT]: '车',
  [PieceType.CANNON]: '炮',
  [PieceType.SOLDIER]: '卒',
};

const RED_PIECE_CHAR: Record<PieceType, string> = {
  [PieceType.GENERAL]: '帅',
  [PieceType.ADVISOR]: '仕',
  [PieceType.ELEPHANT]: '相',
  [PieceType.HORSE]: '傌',
  [PieceType.CHARIOT]: '俥',
  [PieceType.CANNON]: '砲',
  [PieceType.SOLDIER]: '兵',
};

const COL_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

function formatMove(move: { from: Position; to: Position; piece: { type: PieceType; side: Side } }, index: number): string {
  const { from, to, piece } = move;
  const isRed = piece.side === Side.RED;
  const pieceChar = isRed ? RED_PIECE_CHAR[piece.type] : PIECE_CHAR[piece.type];

  const fromColLabel = isRed
    ? COL_LABELS[8 - from.col]
    : String(from.col + 1);
  const toColLabel = isRed
    ? COL_LABELS[8 - to.col]
    : String(to.col + 1);

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;

  let action: string;
  if (colDiff === 0) {
    const steps = Math.abs(rowDiff);
    const stepLabel = isRed ? COL_LABELS[steps - 1] : String(steps);
    action = rowDiff < 0 ? `进${stepLabel}` : `退${stepLabel}`;
  } else if (rowDiff === 0) {
    action = '平' + toColLabel;
  } else {
    const steps = Math.abs(rowDiff);
    const stepLabel = isRed ? COL_LABELS[steps - 1] : String(steps);
    action = rowDiff < 0 ? `进${toColLabel}` : `退${toColLabel}`;
  }

  const moveNum = Math.floor(index / 2) + 1;
  const prefix = index % 2 === 0 ? `${moveNum}. ` : '';

  return `${prefix}${pieceChar}${fromColLabel}${action}`;
}

export default function GameScreen({
  gameMode,
  gameState,
  playerSide,
  connectionStatus = 'disconnected',
  validMoves,
  selectedPosition,
  boardSize,
  boardStyle = 'cyber',
  onBoardClick,
  onReset,
  error,
}: GameScreenProps) {
  const [copied, setCopied] = useState(false);

  const moveCount = gameState?.moves.length || 0;
  const isGameOver = gameState?.status === GameStatus.FINISHED;
  const isWaiting = gameState?.status === GameStatus.WAITING;
  const currentTurn = gameState?.currentTurn;

  const handleCopyRoomId = useCallback(() => {
    if (gameState?.id) {
      navigator.clipboard.writeText(gameState.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [gameState?.id]);

  const moveHistory = gameState?.moves || [];
  const historyRows: string[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    const redMove = formatMove(moveHistory[i], i);
    const blackMove = moveHistory[i + 1] ? formatMove(moveHistory[i + 1], i + 1) : '';
    historyRows.push(`${redMove}${blackMove ? '  ' + blackMove : ''}`);
  }

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected': return { status: 'success' as const, text: '已连接' };
      case 'connecting': return { status: 'warning' as const, text: '连接中...' };
      default: return { status: 'danger' as const, text: '未连接' };
    }
  };

  const getTurnStatus = () => {
    if (currentTurn === Side.RED) return { status: 'danger' as const, text: '红方' };
    if (currentTurn === Side.BLACK) return { status: 'info' as const, text: '黑方' };
    return { status: 'info' as const, text: '—' };
  };

  return (
    <div className="game-layout">
      <div className="game-layout__board">
        <div className="game-layout__board-wrapper">
          <ChessBoard
            id="board-primary"
            gameState={gameState}
            playerSide={gameMode === 'local' ? null : playerSide}
            gameMode={gameMode}
            validMoves={validMoves}
            selectedPosition={selectedPosition}
            size={boardSize}
            style={boardStyle}
            onCellClick={(pos, hasPiece) => {
              onBoardClick(pos, hasPiece);
            }}
          />
        </div>
      </div>

      <div className="game-layout__panel sf-scrollbar">
        <div className="sf-panel-corner sf-panel-corner--tl" />
        <div className="sf-panel-corner sf-panel-corner--tr" />
        <div className="sf-panel-corner sf-panel-corner--bl" />
        <div className="sf-panel-corner sf-panel-corner--br" />

        <div className="panel-header">
          <h2 className="panel-title">对局信息</h2>
          <div className="sf-divider--full" />
        </div>

        <div className="turn-section">
          <div className="sf-label">当前回合</div>
          <StatusBadge status={getTurnStatus().status} showDot={false}>
            {getTurnStatus().text}
          </StatusBadge>
        </div>

        <div className="players-section">
          <div className="sf-label">双方</div>
          <div className="player-row">
            <div className={`player-badge player-red ${currentTurn === Side.RED ? 'player-active' : ''}`}>
              <span className="player-dot" />
              <span className="player-name">红方</span>
            </div>
            <div className="player-vs">VS</div>
            <div className={`player-badge player-black ${currentTurn === Side.BLACK ? 'player-active' : ''}`}>
              <span className="player-dot" />
              <span className="player-name">黑方</span>
            </div>
          </div>
          {(gameMode === 'online' || gameMode === 'ai') && playerSide && (
            <div className="your-side">
              你是: <span className={playerSide === Side.RED ? 'side-red' : 'side-black'}>
                {playerSide === Side.RED ? '红方' : '黑方'}
              </span>
            </div>
          )}
          {gameMode === 'ai' && (
            <div className="your-side">
              对手: <span className="side-black">电脑 (黑方)</span>
            </div>
          )}
        </div>

        {gameMode === 'online' && (
          <div className="connection-section">
            <div className="sf-label">连接状态</div>
            <StatusBadge status={getConnectionStatus().status}>
              {getConnectionStatus().text}
            </StatusBadge>
          </div>
        )}

        {gameMode === 'online' && gameState && (
          <div className="room-section">
            <div className="sf-label">房间号</div>
            <div className="room-id-row">
              <span className="room-id-text">{gameState.id}</span>
              <button className="room-copy-btn" onClick={handleCopyRoomId}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        )}

        <div className="history-section">
          <div className="sf-label">
            步数记录
            <span className="move-count">{moveCount} 步</span>
          </div>
          <div className="history-list sf-scrollbar">
            {historyRows.length === 0 ? (
              <div className="history-empty">暂无记录</div>
            ) : (
              historyRows.map((row, idx) => (
                <div key={idx} className="history-item">
                  {row}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="status-section">
          {isWaiting && gameMode === 'online' && (
            <StatusBadge status="warning">
              等待对手加入...
            </StatusBadge>
          )}
          {isGameOver && (
            <StatusBadge status="danger" showDot={false}>
              游戏结束 — {gameState?.winner === Side.RED ? '红方' : '黑方'}胜利
            </StatusBadge>
          )}
          {!isWaiting && !isGameOver && gameState && (
            <StatusBadge status="success" showDot={false}>
              对局进行中
            </StatusBadge>
          )}
        </div>

        <div className="controls-section">
          <button className="gs-btn" onClick={onReset}>
            <span className="gs-btn-line" />
            <span className="gs-btn-text">{isGameOver ? '再来一局' : '返回菜单'}</span>
          </button>
        </div>

        {error && <ErrorMessage message={error} />}
      </div>
    </div>
  );
}
