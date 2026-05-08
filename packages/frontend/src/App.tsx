import { useState, useCallback, useEffect, useRef } from 'react';
import ChessBoard from './components/ChessBoard';
import GameControls from './components/GameControls';
import { useGameSocket } from './hooks/useGameSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { useBoardController } from './controllers/BoardController';
import { Side, Position } from '@chess/core';
import './App.css';

function App() {
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [showMenu, setShowMenu] = useState(true);

  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  const handleMove = useCallback((from: Position, to: Position) => {
    if (gameMode === 'local') {
      localGame.makeMove(from, to);
    } else {
      onlineGame.makeMove(from, to);
    }
  }, [gameMode, localGame, onlineGame]);

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

  useEffect(() => {
    setGameState(gameState);
  }, [gameState, setGameState]);

  useEffect(() => {
    setValidMoves(activeGame.validMoves);
  }, [activeGame.validMoves, setValidMoves]);

  const handleStartLocal = useCallback(() => {
    setGameMode('local');
    setShowMenu(false);
    resetSelection();
    localGame.resetGame();
  }, [localGame, resetSelection]);

  const handleStartOnline = useCallback(() => {
    setGameMode('online');
    setShowMenu(false);
    resetSelection();
    onlineGame.createGame();
  }, [onlineGame, resetSelection]);

  const handleJoinGame = useCallback((gameId: string) => {
    setGameMode('online');
    setShowMenu(false);
    resetSelection();
    onlineGame.joinGame(gameId);
  }, [onlineGame, resetSelection]);

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
          <h1>天天象棋</h1>
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
