import { useState, useCallback, useEffect, useRef } from 'react';
import MenuScreen from './pages/MenuScreen';
import SplashScreen from './pages/SplashScreen';
import GameScreen from './components/GameScreen';
import { useGameSocket } from './hooks/useGameSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { useBoardController } from './controllers/BoardController';
import { Side, Position } from '@chess/types';
import { clientLogger } from './utils/clientLogger';
import { apiPath } from './utils/api';
import './App.css';

/**
 * App 根组件。
 * 闪屏 → 菜单/游戏界面。
 */
function App() {
  const [screen, setScreen] = useState<'splash' | 'menu' | 'game'>('splash');

  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  const gameIdInputRef = useRef<HTMLInputElement>(null);

  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [boardStyle, setBoardStyle] = useState<string>('cyber');
  const [error, setError] = useState<string | null>(null);

  const {
    state: boardState,
    setGameState,
    setValidMoves,
    resetSelection,
    onBoardClick,
  } = useBoardController(
    useCallback((from: Position, to: Position) => {
      if (gameMode === 'local') {
        localGame.makeMove(from, to);
      } else {
        onlineGame.makeMove(from, to);
      }
    }, [gameMode, localGame, onlineGame]),
    useCallback((position: Position) => {
      if (gameMode === 'local') {
        localGame.getValidMoves(position);
      } else {
        onlineGame.getValidMoves(position);
      }
    }, [gameMode, localGame, onlineGame])
  );

  const activeGame = gameMode === 'local' ? localGame : onlineGame;
  const gameState = activeGame.gameState;

  // 将棋盘控制器与当前活动模式的游戏状态同步。
  useEffect(() => {
    setGameState(gameState);
  }, [gameState, setGameState]);

  // 将活动模式的合法移动同步到棋盘控制器。
  useEffect(() => {
    setValidMoves(activeGame.validMoves);
  }, [activeGame.validMoves, setValidMoves]);

  const handleStartLocal = useCallback(() => {
    setGameMode('local');
    setBoardStyle('cyber');
    setScreen('game');
    resetSelection();
    localGame.resetGame();
  }, [localGame, resetSelection]);

  const handleStartLocal3D = useCallback(() => {
    setGameMode('local');
    setBoardStyle('cyber3d');
    setScreen('game');
    resetSelection();
    localGame.resetGame();
  }, [localGame, resetSelection]);

  const handleStartOnline = useCallback(() => {
    setGameMode('online');
    setBoardStyle('cyber');
    setScreen('game');
    resetSelection();
    onlineGame.createGame();
  }, [onlineGame, resetSelection]);

  const handleJoinGame = useCallback((gameId: string) => {
    setGameMode('online');
    setBoardStyle('cyber');
    setScreen('game');
    resetSelection();
    onlineGame.joinGame(gameId);
  }, [onlineGame, resetSelection]);

  const handleExit = useCallback(async () => {
    try {
      await fetch(apiPath('/api/game/exit'), { method: 'POST' });
    } catch (err) {
      clientLogger.error('Exit button error', { error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const handleReset = useCallback(() => {
    setScreen('menu');
    setBoardStyle('cyber');
    resetSelection();
    onlineGame.resetGame();
    localGame.resetGame();
  }, [onlineGame, localGame, resetSelection]);

  const boardSize = { cellSize: 62, padding: 35 };

  if (screen === 'splash') {
    return <SplashScreen onEnter={() => setScreen('menu')} />;
  }

  if (screen === 'menu') {
    return (
      <MenuScreen
        onStartLocal={handleStartLocal}
        onStartLocal3D={handleStartLocal3D}
        onStartOnline={handleStartOnline}
        onJoinGame={handleJoinGame}
        onExit={handleExit}
        error={error}
      />
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
      boardStyle={boardStyle}
      onBoardClick={onBoardClick}
      onReset={handleReset}
      error={error}
    />
  );
}

export default App;