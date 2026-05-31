import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import GameScreen from '../components/GameScreen';
import { useGameSocket } from '../hooks/useGameSocket';
import { useLocalGame } from '../hooks/useLocalGame';
import { useBoardController } from '../controllers/BoardController';
import { Position, Side } from '@chess/types';
import { clientLogger } from '../utils/clientLogger';
import { apiPath } from '../utils/api';
import { GamePageProps } from '../types/GamePageProps';

export default function GamePage({ pauseBgm, resumeBgm, restartBgm }: GamePageProps) {
  const { mode, gameId } = useParams<{ mode: string; gameId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const layoutName = searchParams.get('layout') || undefined;

  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  const isAI = mode === 'ai';
  const isLocal = mode === 'local' || mode === 'local3d';
  const is3D = mode === 'local3d';
  let boardStyle = (is3D || isAI) ? 'cyber3d' : 'cyber';

  const activeGame = isLocal ? localGame : onlineGame;
  const gameState = activeGame.gameState;

  useEffect(() => {
    pauseBgm?.();
  }, [pauseBgm]);

  useEffect(() => {
    return () => {
      async function loadPreference() {
        try {
          const { getPreference } = await import('../utils/preferenceApi');
          const prefs = await getPreference();
          clientLogger.info('App: preference loaded', { bgmEnabled: prefs.audio.bgm.enabled.value, bgmVolume: prefs.audio.bgm.volume.value });
  
          if(prefs.audio.bgm.enabled.value && resumeBgm) {
            resumeBgm();
          }
        } catch (err) {
          clientLogger.error('App: failed to load preference', { 
            error: err instanceof Error ? err.message : String(err) 
          });
        }
      };
      loadPreference();
    };
  }, [resumeBgm]);

  const makeMove = useCallback((from: Position, to: Position) => {
    if (isLocal) {
      localGame.makeMove(from, to);
    } else {
      onlineGame.makeMove(from, to);
    }
  }, [isLocal, localGame, onlineGame]);

  const getValidMoves = useCallback((position: Position) => {
    if (isLocal) {
      localGame.getValidMoves(position);
    } else {
      onlineGame.getValidMoves(position);
    }
  }, [isLocal, localGame, onlineGame]);

  const {
    state: boardState,
    setGameState,
    setValidMoves,
    resetSelection,
    onBoardClick,
  } = useBoardController(makeMove, getValidMoves);

  useEffect(() => {
    setGameState(gameState);
  }, [gameState, setGameState]);

  useEffect(() => {
    setValidMoves(activeGame.validMoves);
  }, [activeGame.validMoves, setValidMoves]);

  useEffect(() => {
    resetSelection();
    clientLogger.info('GamePage mode changed', { mode, gameId, boardStyle });
    if (mode === 'online') {
      onlineGame.createGame();
    } else if (mode === 'local' || mode === 'local3d') {
      localGame.resetGame();
    } else if (mode === 'ai') {
      onlineGame.createGame(false, layoutName, true);
    } else if (mode === 'join' && gameId) {
      clientLogger.info('Joining game', { gameId });
      onlineGame.joinGame(gameId);
    }
  }, [mode, gameId]);

  const handleReset = useCallback(() => {
    clientLogger.info('Game reset, returning to menu');
    resetSelection();
    onlineGame.resetGame();
    localGame.resetGame();
    navigate('/menu');
  }, [onlineGame, localGame, resetSelection, navigate]);

  const handleExit = useCallback(async () => {
    try {
      await fetch(apiPath('/api/game/exit'), { method: 'POST' });
    } catch (err) {
      clientLogger.error('Exit button error', { error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  // 根据屏幕尺寸动态计算棋盘大小
  const getBoardSize = () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isSmallScreen = window.innerHeight <= 500 || window.innerWidth <= 900;

    if (isSmallScreen && isLandscape) {
      // 横屏手机：缩小棋盘以适应小屏幕
      const availableHeight = window.innerHeight - 32; // 减去padding
      const availableWidth = window.innerWidth - 240; // 减去侧边栏
      const cellSizeByHeight = Math.floor((availableHeight - 70) / 9);
      const cellSizeByWidth = Math.floor((availableWidth - 70) / 8);
      const cellSize = Math.min(cellSizeByHeight, cellSizeByWidth, 45);
      return { cellSize, padding: Math.max(20, Math.floor(cellSize * 0.6)) };
    }

    if (isSmallScreen && !isLandscape) {
      // 竖屏手机
      const availableWidth = window.innerWidth - 32;
      const cellSize = Math.floor((availableWidth - 70) / 8);
      return { cellSize: Math.min(cellSize, 52), padding: Math.max(18, Math.floor(cellSize * 0.5)) };
    }

    // 桌面端默认
    return { cellSize: 62, padding: 35 };
  };

  const [boardSize, setBoardSize] = useState(() => getBoardSize());

  useEffect(() => {
    const handleResize = () => {
      setBoardSize(getBoardSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <GameScreen
      gameMode={isAI ? 'ai' : isLocal ? 'local' : 'online'}
      gameState={gameState}
      playerSide={isAI ? Side.RED : (isLocal ? null : onlineGame.playerSide)}
      connectionStatus={isLocal ? undefined : onlineGame.connectionStatus}
      validMoves={activeGame.validMoves}
      selectedPosition={boardState.selectedPosition}
      boardSize={boardSize}
      boardStyle={boardStyle}
      onBoardClick={onBoardClick}
      onReset={handleReset}
      error={onlineGame.error}
    />
  );
}
