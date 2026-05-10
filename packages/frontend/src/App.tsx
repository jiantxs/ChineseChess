import { useState, useCallback, useEffect, useRef } from 'react';
import ChessBoard from './components/ChessBoard';
import GameControls from './components/GameControls';
import { useGameSocket } from './hooks/useGameSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { useBoardController } from './controllers/BoardController';
import { Side, Position } from '@chess/core';
import './App.css';

/**
 * Root React component for Chinese Chess (Xiangqi).
 *
 * Provides mode switching between local hot-seat and online multiplayer.
 * Displays a menu screen with options to start a local game, create an online room,
 * or join an existing room. Once a game starts, renders the game board(s) and controls.
 *
 * @returns The rendered App component.
 */
function App() {
  /** Current game mode: 'local' for hot-seat play, 'online' for multiplayer via WebSocket. */
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  /** Whether to show the menu screen (true) or the game screen (false). */
  const [showMenu, setShowMenu] = useState(true);

  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  /**
   * Delegates a move to the active game mode (local or online).
   *
   * @param from - The source position of the piece.
   * @param to - The destination position.
   */
  const handleMove = useCallback((from: Position, to: Position) => {
    if (gameMode === 'local') {
      localGame.makeMove(from, to);
    } else {
      onlineGame.makeMove(from, to);
    }
  }, [gameMode, localGame, onlineGame]);

  /**
   * Delegates a request for valid moves to the active game mode.
   *
   * @param position - The board position to query.
   */
  const handleGetValidMoves = useCallback((position: Position) => {
    if (gameMode === 'local') {
      localGame.getValidMoves(position);
    } else {
      onlineGame.getValidMoves(position);
    }
  }, [gameMode, localGame, onlineGame]);

  const {
    state: boardState,
    setGameState,
    setValidMoves,
    resetSelection,
    onBoardClick,
  } = useBoardController(handleMove, handleGetValidMoves);

  const activeGame = gameMode === 'local' ? localGame : onlineGame;
  const gameState = activeGame.gameState;
  const error = gameMode === 'online' ? onlineGame.error : null;

  // Sync the board controller with the current game state from the active mode.
  useEffect(() => {
    setGameState(gameState);
  }, [gameState, setGameState]);

  // Sync valid moves from the active mode into the board controller.
  useEffect(() => {
    setValidMoves(activeGame.validMoves);
  }, [activeGame.validMoves, setValidMoves]);

  /** Starts a local hot-seat game and hides the menu. */
  const handleStartLocal = useCallback(() => {
    setGameMode('local');
    setShowMenu(false);
    resetSelection();
    localGame.resetGame();
  }, [localGame, resetSelection]);

  /** Creates a new online room and hides the menu. */
  const handleStartOnline = useCallback(() => {
    setGameMode('online');
    setShowMenu(false);
    resetSelection();
    onlineGame.createGame();
  }, [onlineGame, resetSelection]);

  /**
   * Joins an existing online room by ID and hides the menu.
   *
   * @param gameId - The room ID to join.
   */
  const handleJoinGame = useCallback((gameId: string) => {
    setGameMode('online');
    setShowMenu(false);
    resetSelection();
    onlineGame.joinGame(gameId);
  }, [onlineGame, resetSelection]);

  /** Returns to the menu and resets both local and online game states. */
  const handleReset = useCallback(() => {
    setShowMenu(true);
    resetSelection();
    onlineGame.resetGame();
    localGame.resetGame();
  }, [onlineGame, localGame, resetSelection]);

  const boardSize = { cellSize: 50, padding: 30 };

  if (showMenu) {
    return (
      <div className="app">
        <div className="menu-container">
          <h1 className="game-title">象棋</h1>
          <div className="menu-buttons">
            <button className="menu-btn primary" onClick={handleStartLocal}>
              本地对战
            </button>
            <button className="menu-btn secondary" onClick={handleStartOnline}>
              创建在线房间
            </button>
            <div className="join-section">
              <input
                type="text"
                placeholder="输入房间号加入"
                className="join-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame(e.currentTarget.value);
                  }
                }}
              />
              <button
                className="menu-btn secondary"
                onClick={() => {
                  const input = document.querySelector('.join-input') as HTMLInputElement;
                  if (input?.value) handleJoinGame(input.value);
                }}
              >
                加入房间
              </button>
            </div>
            <div className="admin-section">
              <a href="/admin" className="menu-btn admin">
                管理
              </a>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-container">
        <div className="game-header">
          <h1>象棋</h1>
          <div className="game-info">
            {gameMode === 'online' && (
              <>
                <span className={`connection-status ${onlineGame.connectionStatus}`}>
                  {onlineGame.connectionStatus === 'connected'
                    ? '已连接'
                    : onlineGame.connectionStatus === 'connecting'
                    ? '连接中...'
                    : '未连接'}
                </span>
                {onlineGame.playerSide && (
                  <span className="player-side-indicator">
                    你是: {onlineGame.playerSide === Side.RED ? '红方' : '黑方'}
                  </span>
                )}
              </>
            )}
            {gameState && (
              <span className="turn-indicator">
                当前回合: {gameState.currentTurn === Side.RED ? '红方' : '黑方'}
              </span>
            )}
          </div>
        </div>

        <div className="game-boards-wrapper" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <ChessBoard
            id="board-primary"
            gameState={gameState}
            playerSide={gameMode === 'local' ? null : onlineGame.playerSide}
            gameMode={gameMode}
            validMoves={activeGame.validMoves}
            selectedPosition={boardState.selectedPosition}
            size={boardSize}
            onCellClick={(pos, hasPiece) => {
              onBoardClick(pos, hasPiece);
            }}
          />
          <ChessBoard
            id="board-secondary"
            gameState={gameState}
            playerSide={gameMode === 'local' ? null : onlineGame.playerSide}
            gameMode={gameMode}
            validMoves={activeGame.validMoves}
            selectedPosition={boardState.selectedPosition}
            size={boardSize}
            onCellClick={(pos, hasPiece) => {
              onBoardClick(pos, hasPiece);
            }}
          />
        </div>

        <GameControls
          gameState={gameState}
          onReset={handleReset}
          gameMode={gameMode}
        />

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default App;
