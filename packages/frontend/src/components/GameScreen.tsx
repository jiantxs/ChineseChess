import { useState, useCallback } from 'react';
import ChessBoard, { ChessBoardSize } from './ChessBoard';
import { GameState, Side, Position, GameStatus, PieceType } from '@chess/types';
import './GameScreen.css';

/** Props for the {@link GameScreen} component. */
export interface GameScreenProps {
  gameMode: 'local' | 'online';
  gameState: GameState | null;
  playerSide: Side | null;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  validMoves: Position[];
  selectedPosition: Position | null;
  boardSize: ChessBoardSize;
  onBoardClick: (pos: Position, hasPiece: boolean) => void;
  onReset: () => void;
  error?: string | null;
}

/** Maps piece type to Chinese character. */
const PIECE_CHAR: Record<PieceType, string> = {
  [PieceType.GENERAL]: '将',
  [PieceType.ADVISOR]: '士',
  [PieceType.ELEPHANT]: '象',
  [PieceType.HORSE]: '马',
  [PieceType.CHARIOT]: '车',
  [PieceType.CANNON]: '炮',
  [PieceType.SOLDIER]: '卒',
};

/** Maps piece type to Chinese character for red side. */
const RED_PIECE_CHAR: Record<PieceType, string> = {
  [PieceType.GENERAL]: '帅',
  [PieceType.ADVISOR]: '仕',
  [PieceType.ELEPHANT]: '相',
  [PieceType.HORSE]: '傌',
  [PieceType.CHARIOT]: '俥',
  [PieceType.CANNON]: '砲',
  [PieceType.SOLDIER]: '兵',
};

/** Column labels for move notation (Chinese convention). */
const COL_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * Formats a single move into Chinese notation.
 * Example: "炮二平五" or "马8进7"
 */
function formatMove(move: { from: Position; to: Position; piece: { type: PieceType; side: Side } }, index: number): string {
  const { from, to, piece } = move;
  const isRed = piece.side === Side.RED;
  const pieceChar = isRed ? RED_PIECE_CHAR[piece.type] : PIECE_CHAR[piece.type];

  // For red: columns are numbered from right (一) to left (九) from red's perspective
  // But our board has col 0 on the left. Red is at bottom (row 9).
  // In Chinese notation, red uses Chinese numerals from right to left.
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
    // Vertical move
    const steps = Math.abs(rowDiff);
    const stepLabel = isRed ? COL_LABELS[steps - 1] : String(steps);
    action = rowDiff < 0 ? `进${stepLabel}` : `退${stepLabel}`;
  } else if (rowDiff === 0) {
    // Horizontal move
    action = '平' + toColLabel;
  } else {
    // Diagonal (horse, elephant, advisor)
    const steps = Math.abs(rowDiff);
    const stepLabel = isRed ? COL_LABELS[steps - 1] : String(steps);
    action = rowDiff < 0 ? `进${toColLabel}` : `退${toColLabel}`;
  }

  const moveNum = Math.floor(index / 2) + 1;
  const prefix = index % 2 === 0 ? `${moveNum}. ` : '';

  return `${prefix}${pieceChar}${fromColLabel}${action}`;
}

/**
 * Desktop-style game screen with left board + right info panel.
 *
 * Features:
 * - Single centered chess board on the left
 * - Info panel on the right with turn indicator, player info, move history, controls
 * - Sci-fi line-art design matching the menu aesthetic
 * - Online mode: shows connection status and room ID
 *
 * @param props - {@link GameScreenProps}
 * @returns The rendered GameScreen component.
 */
export default function GameScreen({
  gameMode,
  gameState,
  playerSide,
  connectionStatus = 'disconnected',
  validMoves,
  selectedPosition,
  boardSize,
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

  // Build move history pairs for display
  const moveHistory = gameState?.moves || [];
  const historyRows: string[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    const redMove = formatMove(moveHistory[i], i);
    const blackMove = moveHistory[i + 1] ? formatMove(moveHistory[i + 1], i + 1) : '';
    historyRows.push(`${redMove}${blackMove ? '  ' + blackMove : ''}`);
  }

  return (
    <div className="game-screen">
      {/* Scanline overlay */}
      <div className="scanlines" />

      {/* Left: Board Area */}
      <div className="board-area">
        <div className="board-wrapper">
          <ChessBoard
            id="board-primary"
            gameState={gameState}
            playerSide={gameMode === 'local' ? null : playerSide}
            gameMode={gameMode}
            validMoves={validMoves}
            selectedPosition={selectedPosition}
            size={boardSize}
            onCellClick={(pos, hasPiece) => {
              onBoardClick(pos, hasPiece);
            }}
          />
        </div>
      </div>

      {/* Right: Info Panel */}
      <div className="info-panel">
        {/* Panel corner decorations */}
        <div className="panel-corner panel-corner-tl" />
        <div className="panel-corner panel-corner-tr" />
        <div className="panel-corner panel-corner-bl" />
        <div className="panel-corner panel-corner-br" />

        {/* Game Title */}
        <div className="panel-header">
          <h2 className="panel-title">对局信息</h2>
          <div className="panel-divider" />
        </div>

        {/* Turn Indicator */}
        <div className="turn-section">
          <div className="section-label">当前回合</div>
          <div className={`turn-badge ${currentTurn === Side.RED ? 'turn-red' : currentTurn === Side.BLACK ? 'turn-black' : ''}`}>
            {currentTurn === Side.RED ? '红方' : currentTurn === Side.BLACK ? '黑方' : '—'}
          </div>
        </div>

        {/* Players */}
        <div className="players-section">
          <div className="section-label">双方</div>
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
          {gameMode === 'online' && playerSide && (
            <div className="your-side">
              你是: <span className={playerSide === Side.RED ? 'side-red' : 'side-black'}>
                {playerSide === Side.RED ? '红方' : '黑方'}
              </span>
            </div>
          )}
        </div>

        {/* Connection Status (online only) */}
        {gameMode === 'online' && (
          <div className="connection-section">
            <div className="section-label">连接状态</div>
            <div className={`connection-badge ${connectionStatus}`}>
              <span className="connection-dot" />
              <span>
                {connectionStatus === 'connected'
                  ? '已连接'
                  : connectionStatus === 'connecting'
                  ? '连接中...'
                  : '未连接'}
              </span>
            </div>
          </div>
        )}

        {/* Room ID (online only) */}
        {gameMode === 'online' && gameState && (
          <div className="room-section">
            <div className="section-label">房间号</div>
            <div className="room-id-row">
              <span className="room-id-text">{gameState.id}</span>
              <button className="room-copy-btn" onClick={handleCopyRoomId}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        )}

        {/* Move History */}
        <div className="history-section">
          <div className="section-label">
            步数记录
            <span className="move-count">{moveCount} 步</span>
          </div>
          <div className="history-list">
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

        {/* Game Status */}
        <div className="status-section">
          {isWaiting && gameMode === 'online' && (
            <div className="status-badge status-waiting">
              <span className="status-pulse" />
              等待对手加入...
            </div>
          )}
          {isGameOver && (
            <div className="status-badge status-gameover">
              游戏结束 — {gameState?.winner === Side.RED ? '红方' : '黑方'}胜利
            </div>
          )}
          {!isWaiting && !isGameOver && gameState && (
            <div className="status-badge status-playing">对局进行中</div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="controls-section">
          <button className="gs-btn gs-btn-primary" onClick={onReset}>
            <span className="gs-btn-line" />
            <span className="gs-btn-text">{isGameOver ? '再来一局' : '返回菜单'}</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="gs-error-message">
            <span className="gs-error-icon">!</span>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
