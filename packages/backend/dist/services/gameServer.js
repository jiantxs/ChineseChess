"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameServer = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
const core_1 = require("@chess/core");
const config_1 = require("@chess/config");
const logger_1 = require("./logger");
const game_records_1 = require("@chess/game-records");
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
class GameServer {
    /** WebSocket server instance */
    wss;
    /** Map of playerId to ConnectedPlayer for all active connections */
    players = new Map();
    /** Reference to GameManager singleton for game operations */
    gameManager;
    /** Interval handle for ping/pong health checks (30 seconds) */
    pingInterval = null;
    /** Interval handle for inactive game cleanup (10 minutes) */
    cleanupInterval = null;
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
    constructor(server, gameManager) {
        this.gameManager = gameManager;
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
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
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const { query } = (0, url_1.parse)(req.url || '', true);
            const playerId = query.playerId;
            if (!playerId) {
                ws.close(1008, 'Missing playerId');
                return;
            }
            const player = {
                ws,
                playerId,
                lastPing: Date.now(),
                isAlive: true,
            };
            this.players.set(playerId, player);
            (0, logger_1.logWebSocketEvent)('connection', playerId);
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    (0, logger_1.logWebSocketEvent)('message', playerId, message.gameId, {
                        messageType: message.type,
                    });
                    this.handleMessage(player, message);
                }
                catch (error) {
                    (0, logger_1.logError)('websocket_message_parse_error', error, { playerId });
                    this.sendError(player, 'Invalid message format');
                }
            });
            ws.on('close', () => {
                (0, logger_1.logWebSocketEvent)('disconnect', playerId, player.gameId);
                this.handleDisconnect(player);
            });
            ws.on('pong', () => {
                player.isAlive = true;
                player.lastPing = Date.now();
            });
            this.sendToPlayer(player, {
                type: core_1.MessageType.PONG,
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
    handleMessage(player, message) {
        switch (message.type) {
            case core_1.MessageType.JOIN_GAME:
                this.handleJoinGame(player, message);
                break;
            case core_1.MessageType.MAKE_MOVE:
                this.handleMakeMove(player, message);
                break;
            case core_1.MessageType.LEAVE_GAME:
                this.handleLeaveGame(player, message);
                break;
            case core_1.MessageType.PING:
                this.handlePing(player);
                break;
            case core_1.MessageType.AI_MOVE:
                this.handleAIMove(player, message);
                break;
            case core_1.MessageType.GET_VALID_MOVES:
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
    handleJoinGame(player, message) {
        const { gameId, side, local, layoutName } = message.payload;
        let targetGameId = gameId;
        let isNewGame = false;
        if (!targetGameId) {
            let layout;
            if (layoutName) {
                try {
                    layout = (0, game_records_1.getLayout)(layoutName);
                }
                catch {
                    layout = core_1.PieceLayout.fromJSON(game_records_1.standardLayoutData);
                }
            }
            else {
                layout = core_1.PieceLayout.fromJSON(game_records_1.standardLayoutData);
            }
            const newGame = this.gameManager.createGame(layout, local || false);
            targetGameId = newGame.id;
            isNewGame = true;
        }
        const game = this.gameManager.joinGame(targetGameId, player.playerId, side);
        if (!game) {
            this.sendError(player, 'Failed to join game');
            return;
        }
        player.gameId = targetGameId;
        player.side = game.redPlayer === player.playerId ? core_1.Side.RED : core_1.Side.BLACK;
        (0, logger_1.logWebSocketEvent)('join_game', player.playerId, targetGameId, {
            side: player.side,
            isNewGame,
            local: local || false,
        });
        for (const p of this.players.values()) {
            if (p.gameId === targetGameId) {
                const yourSide = game.redPlayer === p.playerId ? core_1.Side.RED : core_1.Side.BLACK;
                this.sendToPlayer(p, {
                    type: core_1.MessageType.GAME_STATE,
                    payload: {
                        game: this.sanitizeGameState(game),
                        yourSide,
                    },
                    timestamp: Date.now(),
                    gameId: targetGameId,
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
    handleMakeMove(player, message) {
        if (!player.gameId) {
            this.sendError(player, 'Not in a game');
            return;
        }
        const { from, to } = message.payload;
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
        const game = result.game;
        (0, logger_1.logWebSocketEvent)('make_move', player.playerId, player.gameId, {
            moveNumber: game.moves.length,
            from,
            to,
        });
        for (const p of this.players.values()) {
            if (p.gameId === player.gameId) {
                const yourSide = game.redPlayer === p.playerId ? core_1.Side.RED : core_1.Side.BLACK;
                this.sendToPlayer(p, {
                    type: core_1.MessageType.GAME_STATE,
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
        if (game.status === core_1.GameStatus.FINISHED) {
            (0, logger_1.logWebSocketEvent)('game_over', player.playerId, player.gameId, {
                winner: game.winner,
                reason: 'general_captured',
            });
            this.broadcastToGame(player.gameId, {
                type: core_1.MessageType.GAME_OVER,
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
    handleLeaveGame(player, message) {
        if (!player.gameId) {
            this.sendError(player, 'Not in a game');
            return;
        }
        const game = this.gameManager.leaveGame(player.gameId, player.playerId);
        if (game) {
            this.broadcastToGame(player.gameId, {
                type: core_1.MessageType.PLAYER_DISCONNECTED,
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
    handlePing(player) {
        player.lastPing = Date.now();
        this.sendToPlayer(player, {
            type: core_1.MessageType.PONG,
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
    handleAIMove(player, message) {
        if (!config_1.chessConfig.ai.enabled) {
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
    handleGetValidMoves(player, message) {
        if (!player.gameId) {
            this.sendError(player, 'Not in a game');
            return;
        }
        const { position } = message.payload;
        if (!position || typeof position.row !== 'number' || typeof position.col !== 'number') {
            this.sendError(player, 'Invalid position');
            return;
        }
        const validMoves = this.gameManager.getValidMoves(player.gameId, player.playerId, position);
        this.sendToPlayer(player, {
            type: core_1.MessageType.VALID_MOVES,
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
    handleDisconnect(player) {
        if (player.reconnectTimeout) {
            clearTimeout(player.reconnectTimeout);
            player.reconnectTimeout = undefined;
        }
        if (player.gameId) {
            this.broadcastToGame(player.gameId, {
                type: core_1.MessageType.PLAYER_DISCONNECTED,
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
                    const game = this.gameManager.leaveGame(player.gameId, player.playerId);
                    if (game) {
                        (0, logger_1.logWebSocketEvent)('game_over_disconnect', player.playerId, player.gameId, {
                            winner: game.winner,
                            reason: 'player_disconnect',
                        });
                        this.broadcastToGame(player.gameId, {
                            type: core_1.MessageType.GAME_OVER,
                            payload: {
                                winner: game.winner,
                                reason: 'player_disconnect',
                            },
                            timestamp: Date.now(),
                            gameId: player.gameId,
                        });
                    }
                }
                player.reconnectTimeout = undefined;
            }, config_1.chessConfig.game.reconnectTimeoutMs);
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
    sendToPlayer(player, message) {
        if (player.ws.readyState === ws_1.WebSocket.OPEN) {
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
    broadcastToGame(gameId, message) {
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
    sendError(player, error) {
        this.sendToPlayer(player, {
            type: core_1.MessageType.ERROR,
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
    sanitizeGameState(game) {
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
    startPingInterval() {
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
    startCleanupInterval() {
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
    stop() {
        if (this.pingInterval)
            clearInterval(this.pingInterval);
        if (this.cleanupInterval)
            clearInterval(this.cleanupInterval);
        this.wss.close();
    }
}
exports.GameServer = GameServer;
//# sourceMappingURL=gameServer.js.map