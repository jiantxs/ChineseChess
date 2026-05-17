import { useState, useCallback, useEffect, useRef } from 'react';
import GameScreen from './components/GameScreen';
import { useGameSocket } from './hooks/useGameSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { useBoardController } from './controllers/BoardController';
import { Side, Position } from '@chess/types';
import { clientLogger } from './utils/clientLogger';
import { apiPath } from './utils/api';
import './App.css';

/**
 * 中国象棋 (象棋) 的根 React 组件。
 *
 * 提供本地双人对战和在线多人游戏的模式切换。
 * 显示菜单界面，包含开始本地游戏、创建在线房间或加入已有房间的选项。
 * 游戏开始后，渲染棋盘和控制器。
 *
 * @returns 渲染的 App 组件。
 */
function App() {
  /** 当前游戏模式：'local' 为双人对战，'online' 为通过 WebSocket 的多人游戏。 */
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  /** 是否显示菜单界面 (true) 或游戏界面 (false)。 */
  const [showMenu, setShowMenu] = useState(true);

  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  const gameIdInputRef = useRef<HTMLInputElement>(null);

  /**
   * 将移动委托给当前活动的游戏模式（本地或在线）。
   *
   * @param from - 棋子的起始位置。
   * @param to - 目标位置。
   */
  const handleMove = useCallback((from: Position, to: Position) => {
    if (gameMode === 'local') {
      localGame.makeMove(from, to);
    } else {
      onlineGame.makeMove(from, to);
    }
  }, [gameMode, localGame, onlineGame]);

  /**
   * 将获取有效移动的请求委托给当前活动的游戏模式。
   *
   * @param position - 要查询的棋盘位置。
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

  // 将棋盘控制器与当前活动模式的游戏状态同步。
  useEffect(() => {
    setGameState(gameState);
  }, [gameState, setGameState]);

  // 将活动模式的合法移动同步到棋盘控制器。
  useEffect(() => {
    setValidMoves(activeGame.validMoves);
  }, [activeGame.validMoves, setValidMoves]);

  /** 开始本地双人对战并隐藏菜单。 */
  const handleStartLocal = useCallback(() => {
    setGameMode('local');
    setShowMenu(false);
    resetSelection();
    localGame.resetGame();
  }, [localGame, resetSelection]);

  /** 创建新的在线房间并隐藏菜单。 */
  const handleStartOnline = useCallback(() => {
    setGameMode('online');
    setShowMenu(false);
    resetSelection();
    onlineGame.createGame();
  }, [onlineGame, resetSelection]);

  /**
   * 通过 ID 加入一个已存在的在线房间并隐藏菜单。
   *
   * @param gameId - 要加入的房间 ID。
   */
  const handleJoinGame = useCallback((gameId: string) => {
    setGameMode('online');
    setShowMenu(false);
    resetSelection();
    onlineGame.joinGame(gameId);
  }, [onlineGame, resetSelection]);

  /** 返回菜单并重置本地和在线游戏状态。 */
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
        {/* 动态背景图片 */}
        <div className="background-layer" />
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
                  await fetch(apiPath('/api/game/exit'), { method: 'POST' });
                } catch (err) {
                  clientLogger.error('Exit button error', { error: err instanceof Error ? err.message : String(err) });
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
