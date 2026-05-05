import { useState, useCallback } from 'react';
import ChessBoard from './components/ChessBoard';
import GameControls from './components/GameControls';
import { useGameSocket } from './hooks/useGameSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { Side } from '@shared/types';
import './App.css';

function App() {
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [showMenu, setShowMenu] = useState(true);
  
  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  const getActiveGame = useCallback(() => {
    return gameMode === 'local' ? localGame : onlineGame;
  }, [gameMode, localGame, onlineGame]);

  const handleStartLocal = useCallback(() => {
    setGameMode('local');
    setShowMenu(false);
    localGame.resetGame();
  }, [localGame]);

  const handleStartOnline = useCallback(() => {
    setGameMode('online');
    setShowMenu(false);
    onlineGame.createGame();
  }, [onlineGame]);

  const handleJoinGame = useCallback((gameId: string) => {
    setGameMode('online');
    setShowMenu(false);
    onlineGame.joinGame(gameId);
  }, [onlineGame]);

  const handleReset = useCallback(() => {
    setShowMenu(true);
    onlineGame.resetGame();
    localGame.resetGame();
  }, [onlineGame, localGame]);

  const activeGame = getActiveGame();
  const gameState = activeGame.gameState;
  const error = gameMode === 'online' ? onlineGame.error : null;

  if (showMenu) {
    return (
      <div className="app">
        <div className="menu-container">
          <h1 className="game-title">天天象棋</h1>
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
          <h1>天天象棋</h1>
          <div className="game-info">
            {gameMode === 'online' && (
              <span className={`connection-status ${onlineGame.connectionStatus}`}>
                {onlineGame.connectionStatus === 'connected' ? '已连接' : '连接中...'}
              </span>
            )}
            {gameState && (
              <span className="turn-indicator">
                当前回合: {gameState.currentTurn === Side.RED ? '红方' : '黑方'}
              </span>
            )}
          </div>
        </div>

        <div className="game-board-wrapper">
          <ChessBoard
            gameState={gameState}
            playerSide={gameMode === 'local' ? null : onlineGame.playerSide}
            gameMode={gameMode}
            onMove={gameMode === 'local' ? localGame.makeMove : onlineGame.makeMove}
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
