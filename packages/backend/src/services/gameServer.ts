import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import {
  GameMessage,
  MessageType,
  Position,
  Side,
  GameStatus,
  GameManager,
} from '@chess/core';
import { chessConfig } from '@chess/config';
import { logWebSocketEvent, logError } from './logger';

interface ConnectedPlayer {
  ws: WebSocket;
  playerId: string;
  gameId?: string;
  side?: Side;
  lastPing: number;
  isAlive: boolean;
  reconnectTimeout?: NodeJS.Timeout;
}

export class GameServer {
  private wss: WebSocketServer;
  private players: Map<string, ConnectedPlayer> = new Map();
  private gameManager: GameManager;
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(server: import('http').Server | import('https').Server, gameManager: GameManager) {
    this.gameManager = gameManager;
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.startPingInterval();
    this.startCleanupInterval();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const { query } = parseUrl(req.url || '', true);
      const playerId = query.playerId as string;

      if (!playerId) {
        ws.close(1008, 'Missing playerId');
        return;
      }

      const player: ConnectedPlayer = {
        ws,
        playerId,
        lastPing: Date.now(),
        isAlive: true,
      };

      this.players.set(playerId, player);

      logWebSocketEvent('connection', playerId);

      ws.on('message', (data: RawData) => {
        try {
          const message: GameMessage = JSON.parse(data.toString());
          logWebSocketEvent('message', playerId, message.gameId, {
            messageType: message.type,
          });
          this.handleMessage(player, message);
        } catch (error) {
          logError('websocket_message_parse_error', error as Error, { playerId });
          this.sendError(player, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        logWebSocketEvent('disconnect', playerId, player.gameId);
        this.handleDisconnect(player);
      });

      ws.on('pong', () => {
        player.isAlive = true;
        player.lastPing = Date.now();
      });

      this.sendToPlayer(player, {
        type: MessageType.PONG,
        payload: { connected: true },
        timestamp: Date.now(),
        gameId: '',
      });
    });
  }

  private handleMessage(player: ConnectedPlayer, message: GameMessage): void {
    switch (message.type) {
      case MessageType.JOIN_GAME:
        this.handleJoinGame(player, message);
        break;
      case MessageType.MAKE_MOVE:
        this.handleMakeMove(player, message);
        break;
      case MessageType.LEAVE_GAME:
        this.handleLeaveGame(player, message);
        break;
      case MessageType.PING:
        this.handlePing(player);
        break;
      case MessageType.AI_MOVE:
        this.handleAIMove(player, message);
        break;
      case MessageType.GET_VALID_MOVES:
        this.handleGetValidMoves(player, message);
        break;
      default:
        this.sendError(player, 'Unknown message type');
    }
  }

  private handleJoinGame(player: ConnectedPlayer, message: GameMessage): void {
    const { gameId, side, local } = message.payload as { gameId?: string; side?: Side; local?: boolean };

    let targetGameId = gameId;
    let isNewGame = false;

    if (!targetGameId) {
      const newGame = this.gameManager.createGame(local || false);
      targetGameId = newGame.id;
      isNewGame = true;
    }

    const game = this.gameManager.joinGame(targetGameId!, player.playerId, side);

    if (!game) {
      this.sendError(player, 'Failed to join game');
      return;
    }

    player.gameId = targetGameId!;
    player.side = game.redPlayer === player.playerId ? Side.RED : Side.BLACK;

    logWebSocketEvent('join_game', player.playerId, targetGameId, {
      side: player.side,
      isNewGame,
      local: local || false,
    });

    for (const p of this.players.values()) {
      if (p.gameId === targetGameId) {
        const yourSide = game.redPlayer === p.playerId ? Side.RED : Side.BLACK;
        this.sendToPlayer(p, {
          type: MessageType.GAME_STATE,
          payload: {
            game: this.sanitizeGameState(game),
            yourSide,
          },
          timestamp: Date.now(),
          gameId: targetGameId!,
        });
      }
    }
  }

  private handleMakeMove(player: ConnectedPlayer, message: GameMessage): void {
    if (!player.gameId) {
      this.sendError(player, 'Not in a game');
      return;
    }

    const { from, to } = message.payload as { from: Position; to: Position };

    if (!from || !to ||
        typeof from.row !== 'number' || typeof from.col !== 'number' ||
        typeof to.row !== 'number' || typeof to.col !== 'number' ||
        from.row < 0 || from.row > 9 || from.col < 0 || from.col > 8 ||
        to.row < 0 || to.row > 9 || to.col < 0 || to.col > 8) {
      this.sendError(player, 'Invalid coordinates');
      return;
    }

    const result = this.gameManager.makeMove(player.gameId, player.playerId, from, to);

    if (!result.success) {
      this.sendError(player, result.error || 'Move failed');
      return;
    }

    const game = result.game!;

    logWebSocketEvent('make_move', player.playerId, player.gameId, {
      moveNumber: game.moves.length,
      from,
      to,
    });

    for (const p of this.players.values()) {
      if (p.gameId === player.gameId) {
        const yourSide = game.redPlayer === p.playerId ? Side.RED : Side.BLACK;
        this.sendToPlayer(p, {
          type: MessageType.GAME_STATE,
          payload: {
            game: this.sanitizeGameState(game),
            yourSide,
            lastMove: { from, to },
          },
          timestamp: Date.now(),
          gameId: player.gameId,
        });
      }
    }

    if (game.status === GameStatus.FINISHED) {
      logWebSocketEvent('game_over', player.playerId, player.gameId, {
        winner: game.winner,
        reason: 'general_captured',
      });
      this.broadcastToGame(player.gameId, {
        type: MessageType.GAME_OVER,
        payload: {
          winner: game.winner,
          reason: 'general_captured',
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });
    }
  }

  private handleLeaveGame(player: ConnectedPlayer, message: GameMessage): void {
    if (!player.gameId) {
      this.sendError(player, 'Not in a game');
      return;
    }

    const game = this.gameManager.leaveGame(player.gameId, player.playerId);

    if (game) {
      this.broadcastToGame(player.gameId, {
        type: MessageType.PLAYER_DISCONNECTED,
        payload: {
          playerId: player.playerId,
          game: this.sanitizeGameState(game),
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });
    }

    player.gameId = undefined;
    player.side = undefined;
  }

  private handlePing(player: ConnectedPlayer): void {
    player.lastPing = Date.now();
    this.sendToPlayer(player, {
      type: MessageType.PONG,
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
      gameId: player.gameId || '',
    });
  }

  private handleAIMove(player: ConnectedPlayer, message: GameMessage): void {
    if (!chessConfig.ai.enabled) {
      this.sendError(player, 'AI is not enabled');
      return;
    }

    this.sendError(player, 'AI not yet implemented');
  }

  private handleGetValidMoves(player: ConnectedPlayer, message: GameMessage): void {
    if (!player.gameId) {
      this.sendError(player, 'Not in a game');
      return;
    }

    const { position } = message.payload as { position: Position };

    if (!position || typeof position.row !== 'number' || typeof position.col !== 'number') {
      this.sendError(player, 'Invalid position');
      return;
    }

    const validMoves = this.gameManager.getValidMoves(
      player.gameId,
      player.playerId,
      position
    );

    this.sendToPlayer(player, {
      type: MessageType.VALID_MOVES,
      payload: { moves: validMoves },
      timestamp: Date.now(),
      gameId: player.gameId,
    });
  }

  private handleDisconnect(player: ConnectedPlayer): void {
    if (player.reconnectTimeout) {
      clearTimeout(player.reconnectTimeout);
      player.reconnectTimeout = undefined;
    }

    if (player.gameId) {
      this.broadcastToGame(player.gameId, {
        type: MessageType.PLAYER_DISCONNECTED,
        payload: {
          playerId: player.playerId,
          message: 'Player disconnected',
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });

      player.reconnectTimeout = setTimeout(() => {
        const reconnected = this.players.get(player.playerId);
        if (!reconnected || !reconnected.gameId) {
          const game = this.gameManager.leaveGame(player.gameId!, player.playerId);
          if (game) {
            logWebSocketEvent('game_over_disconnect', player.playerId, player.gameId!, {
              winner: game.winner,
              reason: 'player_disconnect',
            });
            this.broadcastToGame(player.gameId!, {
              type: MessageType.GAME_OVER,
              payload: {
                winner: game.winner,
                reason: 'player_disconnect',
              },
              timestamp: Date.now(),
              gameId: player.gameId!,
            });
          }
        }
        player.reconnectTimeout = undefined;
      }, chessConfig.game.reconnectTimeoutMs);
    }

    this.players.delete(player.playerId);
  }

  private sendToPlayer(player: ConnectedPlayer, message: GameMessage): void {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToGame(gameId: string, message: GameMessage): void {
    for (const player of this.players.values()) {
      if (player.gameId === gameId) {
        this.sendToPlayer(player, message);
      }
    }
  }

  private sendError(player: ConnectedPlayer, error: string): void {
    this.sendToPlayer(player, {
      type: MessageType.ERROR,
      payload: { error },
      timestamp: Date.now(),
      gameId: player.gameId || '',
    });
  }

  private sanitizeGameState(game: import('@chess/core').GameState) {
    return {
      id: game.id,
      board: game.board,
      currentTurn: game.currentTurn,
      moves: game.moves,
      status: game.status,
      winner: game.winner,
      redPlayer: game.redPlayer ? true : false,
      blackPlayer: game.blackPlayer ? true : false,
      lastMoveTime: game.lastMoveTime,
      createdAt: game.createdAt,
      localGame: game.localGame || false,
    };
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const player of this.players.values()) {
        if (!player.isAlive) {
          player.ws.terminate();
          this.handleDisconnect(player);
          continue;
        }
        player.isAlive = false;
        player.ws.ping();
      }
    }, 30000);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.gameManager.cleanupInactiveGames(3600000);
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} inactive games`);
      }
    }, 600000);
  }

  stop(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.wss.close();
  }
}
