/**
 * @fileoverview WebSocket game server handling real-time multiplayer
 * @module backend/src/services/gameServer
 *
 * Manages WebSocket connections for Chinese Chess multiplayer games.
 * Handles player authentication, game creation/joining, move validation,
 * and real-time game state synchronization.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

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
  PieceLayout,
} from '@chess/core';
import { chessConfig } from '@chess/config';
import { logWebSocketEvent, logError } from './logger';
import { getLayout, standardLayoutData } from '@chess/game-records';

/**
 * Represents a connected WebSocket player
 * @interface ConnectedPlayer
 * @description Tracks WebSocket connection state and current game association
 *              for each connected player client.
 */
interface ConnectedPlayer {
  /** The active WebSocket connection */
  ws: WebSocket;
  /** Unique player identifier (UUID from client) */
  playerId: string;
  /** Current game ID if player is in a game */
  gameId?: string;
  /** Player's side (RED or BLACK) if in a game */
  side?: Side;
  /** Timestamp of last ping response */
  lastPing: number;
  /** Connection health flag (set false by ping, true by pong) */
  isAlive: boolean;
  /** Timeout handle for reconnect window after disconnect */
  reconnectTimeout?: NodeJS.Timeout;
}

/**
 * WebSocket game server for real-time multiplayer Chinese Chess
 * @class GameServer
 * @description Manages WebSocket connections, game state synchronization,
 *              player authentication via playerId query param, and automatic
 *              cleanup of inactive games and connections.
 *
 * @remarks
 * - Listens on path '/ws' for WebSocket connections
 * - Requires 'playerId' query parameter for connection authentication
 * - Implements 30-second ping/pong health checks
 * - Implements 10-minute cleanup interval for inactive games
 * - 30-second reconnect window before player forfeit
 *
 * @example
 * const server = createServer(app);
 * const gameServer = new GameServer(server, gameManager);
 * // Server stops on SIGTERM via gameServer.stop()
 */
export class GameServer {
  /** WebSocket server instance */
  private wss: WebSocketServer;
  /** Map of playerId to ConnectedPlayer for all active connections */
  private players: Map<string, ConnectedPlayer> = new Map();
  /** Reference to GameManager singleton for game operations */
  private gameManager: GameManager;
  /** Interval handle for ping/pong health checks (30 seconds) */
  private pingInterval: NodeJS.Timeout | null = null;
  /** Interval handle for inactive game cleanup (10 minutes) */
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Create a new GameServer instance
   * @constructor
   * @param server - HTTP server to attach WebSocket server to
   * @param gameManager - GameManager instance for game operations
   *
   * @remarks
   * - Creates WebSocketServer on '/ws' path
   * - Automatically starts ping interval and cleanup interval
   * - Sets up connection handler for new WebSocket clients
   */
  constructor(server: import('http').Server | import('https').Server, gameManager: GameManager) {
    this.gameManager = gameManager;
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.startPingInterval();
    this.startCleanupInterval();
  }

  /**
   * Set up WebSocket server connection handler
   * @private
   * @description Registers event handlers for:
   *              - Connection (validates playerId, registers player)
   *              - Message (parses JSON, routes to handler)
   *              - Close (handles disconnect with reconnect window)
   *              - Pong (updates isAlive flag)
   *
   * @remarks
   * - Rejects connections without playerId query param with code 1008
   * - Sends initial PONG message on successful connection
   * - Parses messages as JSON GameMessage objects
   * - Logs all events via logWebSocketEvent
   */
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

  /**
   * Route incoming message by type to appropriate handler
   * @private
   * @description Dispatches GameMessage to specific handler based on MessageType.
   *              Sends error response for unknown message types.
   *
   * @param player - The ConnectedPlayer who sent the message
   * @param message - The parsed GameMessage to handle
   *
   * @see {@link handleJoinGame}
   * @see {@link handleMakeMove}
   * @see {@link handleLeaveGame}
   * @see {@link handlePing}
   * @see {@link handleAIMove}
   * @see {@link handleGetValidMoves}
   */
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

  /**
   * Handle JOIN_GAME message - create or join a game
   * @private
   * @description Creates a new game if no gameId provided, or joins existing game.
   *              Loads specified layout or uses standard layout as default.
   *              Broadcasts GAME_STATE to all players in the game.
   *
   * @param player - The ConnectedPlayer joining a game
   * @param message - Message containing optional gameId, side, local flag, layoutName
   *
   * @remarks
   * - If no gameId: creates new game with specified or default layout
   * - If gameId provided: joins existing game if available
   * - Assigns RED/BLACK side based on which player slot is available
   * - Sends GAME_STATE to all players in game with their assigned side
   */
  private handleJoinGame(player: ConnectedPlayer, message: GameMessage): void {
    const { gameId, side, local, layoutName } = message.payload as { gameId?: string; side?: Side; local?: boolean; layoutName?: string };

    let targetGameId = gameId;
    let isNewGame = false;

    if (!targetGameId) {
      let layout: PieceLayout;
      if (layoutName) {
        try {
          layout = getLayout(layoutName);
        } catch {
          layout = PieceLayout.fromJSON(standardLayoutData);
        }
      } else {
        layout = PieceLayout.fromJSON(standardLayoutData);
      }
      const newGame = this.gameManager.createGame(layout, local || false);
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

  /**
   * Handle MAKE_MOVE message - validate and execute a chess move
   * @private
   * @description Validates move coordinates and player turn, then executes move
   *              via GameManager. Broadcasts updated GAME_STATE to all players.
   *              If game ends, broadcasts GAME_OVER.
   *
   * @param player - The ConnectedPlayer making the move
   * @param message - Message containing from and to positions
   *
   * @remarks
   * - Validates coordinates are within 0-9 (row) and 0-8 (col)
   * - Returns error if player is not in a game
   * - Returns error if move validation fails
   * - Broadcasts GAME_STATE with lastMove info to both players
   * - Broadcasts GAME_OVER when general is captured
   */
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

  /**
   * Handle LEAVE_GAME message - player voluntarily leaves game
   * @private
   * @description Removes player from current game via GameManager.
   *              Broadcasts PLAYER_DISCONNECTED to remaining players.
   *
   * @param player - The ConnectedPlayer leaving the game
   * @param message - The leave game message (payload unused)
   *
   * @remarks
   * - Player's gameId and side are cleared after leaving
   * - Remaining players receive updated game state
   * - Game continues with remaining player until finished
   */
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

  /**
   * Handle PING message - respond with PONG and update timestamp
   * @private
   * @description Updates player's lastPing and responds with PONG message.
   *              Used by client to keep connection alive and verify server responsiveness.
   *
   * @param player - The ConnectedPlayer who sent the ping
   *
   * @remarks
   * - Returns current server timestamp in response
   * - lastPing updated for connection health tracking
   */
  private handlePing(player: ConnectedPlayer): void {
    player.lastPing = Date.now();
    this.sendToPlayer(player, {
      type: MessageType.PONG,
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
      gameId: player.gameId || '',
    });
  }

  /**
   * Handle AI_MOVE message - request AI move calculation
   * @private
   * @description Placeholder for AI opponent integration.
   *              Returns error indicating AI is not yet implemented.
   *
   * @param player - The ConnectedPlayer requesting AI move
   * @param message - The AI move request message
   *
   * @remarks
   * - Returns error if AI is not enabled via chessConfig
   * - Returns error "AI not yet implemented" when AI feature is requested
   * - AI integration would go here when ENABLE_AI is fully implemented
   */
  private handleAIMove(player: ConnectedPlayer, message: GameMessage): void {
    if (!chessConfig.ai.enabled) {
      this.sendError(player, 'AI is not enabled');
      return;
    }

    this.sendError(player, 'AI not yet implemented');
  }

  /**
   * Handle GET_VALID_MOVES message - get legal moves for a piece
   * @private
   * @description Queries GameManager for all valid moves for a piece at given position.
   *              Returns array of valid destination positions.
   *
   * @param player - The ConnectedPlayer requesting valid moves
   * @param message - Message containing position of piece to evaluate
   *
   * @returns VALID_MOVES message with array of valid destination positions
   *
   * @remarks
   * - Position coordinates must be valid numbers
   * - Returns empty array if no valid moves available
   * - Used by frontend to highlight valid move destinations
   */
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

  /**
   * Handle WebSocket disconnect - manage cleanup and reconnect window
   * @private
   * @description Processes player disconnection:
   *              - Clears any pending reconnect timeout
   *              - Broadcasts PLAYER_DISCONNECTED to game
   *              - Sets 30-second reconnect window before forfeit
   *              - Removes player from players map after timeout
   *
   * @param player - The ConnectedPlayer who disconnected
   *
   * @remarks
   * - If player reconnects within timeout, they keep their game slot
   * - If timeout expires, player is forfeited and game may end
   * - Uses chessConfig.game.reconnectTimeoutMs for timeout duration
   */
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

  /**
   * Send a message to a specific player
   * @private
   * @description Serializes and sends GameMessage to player's WebSocket
   *              if connection is in OPEN state.
   *
   * @param player - The ConnectedPlayer to send message to
   * @param message - The GameMessage to send
   *
   * @remarks
   * - Checks readyState before sending to avoid errors
   * - JSON stringifies the message object
   */
  private sendToPlayer(player: ConnectedPlayer, message: GameMessage): void {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a message to all players in a game
   * @private
   * @description Sends a message to all connected players currently in the specified game.
   *
   * @param gameId - The game ID to broadcast to
   * @param message - The GameMessage to send to each player
   *
   * @see {@link sendToPlayer}
   */
  private broadcastToGame(gameId: string, message: GameMessage): void {
    for (const player of this.players.values()) {
      if (player.gameId === gameId) {
        this.sendToPlayer(player, message);
      }
    }
  }

  /**
   * Send an error message to a player
   * @private
   * @description Convenience method to send ERROR message type to player.
   *
   * @param player - The ConnectedPlayer to send error to
   * @param error - Error message string
   *
   * @see {@link sendToPlayer}
   */
  private sendError(player: ConnectedPlayer, error: string): void {
    this.sendToPlayer(player, {
      type: MessageType.ERROR,
      payload: { error },
      timestamp: Date.now(),
      gameId: player.gameId || '',
    });
  }

  /**
   * Remove sensitive data from game state before sending to client
   * @private
   * @description Creates sanitized game state object that:
   *              - Omits actual player IDs (replaced with booleans)
   *              - Only includes safe fields for client consumption
   *
   * @param game - Full GameState from GameManager
   * @returns Sanitized game state object safe for client
   */
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

  /**
   * Start ping interval for connection health checks
   * @private
   * @description Starts 30-second interval that:
   *              - Sets isAlive = false for all players
   *              - Sends ping to each player
   *              - Terminates connection if pong not received (isAlive stays false)
   *
   * @remarks
   * - Uses WebSocket ping() method
   * - Pong handler sets isAlive = true
   * - Connections without pong response are terminated
   */
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

  /**
   * Start cleanup interval for inactive games
   * @private
   * @description Starts 10-minute interval that:
   *              - Calls GameManager.cleanupInactiveGames(3600000)
   *              - Logs number of games cleaned up if any
   *
   * @remarks
   * - Cleans up games inactive for 1 hour (3600000 ms)
   * - Only logs when games are actually cleaned
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.gameManager.cleanupInactiveGames(3600000);
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} inactive games`);
      }
    }, 600000);
  }

  /**
   * Gracefully stop the game server
   * @description Stops all intervals and closes WebSocket server.
   *              Called during SIGTERM shutdown.
   *
   * @remarks
   * - Clears ping interval if running
   * - Clears cleanup interval if running
   * - Closes WebSocket server (no new connections accepted)
   * - Existing connections will be terminated
   */
  stop(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.wss.close();
  }
}
