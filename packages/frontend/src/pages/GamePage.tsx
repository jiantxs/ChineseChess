import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  const onlineGame = useGameSocket();
  const localGame = useLocalGame();

  const isAI = mode === 'ai';
  const isLocal = mode === 'local' || mode === 'local3d';
  const is3D = mode === 'local3d';
  const boardStyle = is3D ? 'cyber3d' : 'cyber';

  const activeGame = isLocal ? localGame : onlineGame;
  const gameState = activeGame.gameState;

  useEffect(() => {
    pauseBgm?.();
  }, [pauseBgm]);

  useEffect(() => {
    return () => {
      resumeBgm?.();
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
      onlineGame.createGame(false, undefined, true);
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

  const boardSize = { cellSize: 62, padding: 35 };

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
