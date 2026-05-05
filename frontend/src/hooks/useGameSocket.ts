import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  GameMessage,
  MessageType,
  Side,
  Position,
  GameStatus,
} from '@shared/types';

interface UseGameSocketReturn {
  gameState: GameState | null;
  playerSide: Side | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  error: string | null;
  createGame: () => void;
  joinGame: (gameId: string) => void;
  makeMove: (from: Position, to: Position) => void;
  resetGame: () => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerSide, setPlayerSide] = useState<Side | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string>('');
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getPlayerId = useCallback(async (): Promise<string> => {
    if (playerIdRef.current) return playerIdRef.current;
    
    try {
      const response = await fetch('/api/game/player-id', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      playerIdRef.current = data.playerId;
      return data.playerId;
    } catch {
      const fallbackId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      playerIdRef.current = fallbackId;
      return fallbackId;
    }
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      const playerId = await getPlayerId();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?playerId=${playerId}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const message: GameMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
      
      ws.onclose = () => {
        setConnectionStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
      
      ws.onerror = () => {
        setError('Connection error');
        setConnectionStatus('disconnected');
      };
      
      wsRef.current = ws;
    } catch (err) {
      setError('Failed to connect');
      setConnectionStatus('disconnected');
    }
  }, [getPlayerId]);

  const handleMessage = useCallback((message: GameMessage) => {
    switch (message.type) {
      case MessageType.GAME_STATE:
        const payload = message.payload as {
          game: GameState;
          yourSide?: Side;
          lastMove?: { from: Position; to: Position };
        };
        setGameState(payload.game);
        if (payload.yourSide) {
          setPlayerSide(payload.yourSide);
        }
        break;
        
      case MessageType.GAME_OVER:
        const gameOverPayload = message.payload as {
          winner: Side;
          reason: string;
        };
        setGameState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: GameStatus.FINISHED,
            winner: gameOverPayload.winner,
          };
        });
        break;
        
      case MessageType.ERROR:
        const errorPayload = message.payload as { error: string };
        setError(errorPayload.error);
        break;
        
      case MessageType.PONG:
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  }, []);

  const sendMessage = useCallback((message: Omit<GameMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
    } else {
      setError('Not connected to server');
    }
  }, []);

  const createGame = useCallback(() => {
    connect();
    setTimeout(() => {
      sendMessage({
        type: MessageType.JOIN_GAME,
        payload: {},
        gameId: '',
      });
    }, 500);
  }, [connect, sendMessage]);

  const joinGame = useCallback((gameId: string) => {
    connect();
    setTimeout(() => {
      sendMessage({
        type: MessageType.JOIN_GAME,
        payload: { gameId },
        gameId,
      });
    }, 500);
  }, [connect, sendMessage]);

  const makeMove = useCallback((from: Position, to: Position) => {
    if (!gameState) return;

    sendMessage({
      type: MessageType.MAKE_MOVE,
      payload: { from, to },
      gameId: gameState.id,
    });
  }, [gameState, sendMessage]);

  const resetGame = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setGameState(null);
    setPlayerSide(null);
    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    gameState,
    playerSide,
    connectionStatus,
    error,
    createGame,
    joinGame,
    makeMove,
    resetGame,
  };
}
