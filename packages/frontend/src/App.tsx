import { useState, useCallback, useEffect, useRef } from 'react';
import GameScreen from './components/GameScreen';
import { useGameSocket } from './hooks/useGameSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { useBoardController } from './controllers/BoardController';
import { Side, Position } from '@chess/types';
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

  const gameIdInputRef = useRef<HTMLInputElement>(null);

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

  const boardSize = { cellSize: 62, padding: 35 };

  if (showMenu) {
    return (
      <div className="app menu-app">
        {/* 扫描线 overlay */}
        <div className="scanlines" />
        <div className="menu-container">
          {/* 面板四角装饰 */}
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          <h1 className="game-title">
            <span className="title-char">象</span>
            <span className="title-char">棋</span>
          </h1>

          <div className="menu-divider" />

          <div className="menu-buttons">
            <button className="menu-btn" onClick={handleStartLocal}>
              <span className="btn-line" />
              <span className="btn-text">单机对战</span>
            </button>

            <button className="menu-btn" onClick={handleStartOnline}>
              <span className="btn-line" />
              <span className="btn-text">开始联机</span>
            </button>

            <div className="join-section">
              <input
                ref={gameIdInputRef}
                type="text"
                placeholder="输入房间号"
                className="join-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame(e.currentTarget.value);
                  }
                }}
              />
              <button
                className="menu-btn"
                onClick={() => {
                  const input = gameIdInputRef.current;
                  if (input?.value) handleJoinGame(input.value);
                }}
              >
                <span className="btn-line" />
                <span className="btn-text">加入房间</span>
              </button>
            </div>

            <button
              className="menu-btn exit-btn"
              onClick={async () => {
                try {
                  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                  const pathname = window.location.pathname;
                  const pathPrefix = pathname === '/' ? '' : pathname.replace(/\/[^\/]*$/, '');
                  const Path = pathPrefix ? `${pathPrefix}/api/game/exit` : '/api/game/exit';
                  const Url = `${protocol}//${window.location.host}${Path}`;
                  await fetch(Url, { method: 'POST' });
                } catch {
                  // Server may close connection before response; ignore error
                }
              }}
            >
              <span className="btn-line" />
              <span className="btn-text">退出游戏</span>
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">!</span>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <GameScreen
      gameMode={gameMode}
      gameState={gameState}
      playerSide={gameMode === 'local' ? null : onlineGame.playerSide}
      connectionStatus={gameMode === 'online' ? onlineGame.connectionStatus : undefined}
      validMoves={activeGame.validMoves}
      selectedPosition={boardState.selectedPosition}
      boardSize={boardSize}
      onBoardClick={onBoardClick}
      onReset={handleReset}
      error={error}
    />
  );
}

export default App;
