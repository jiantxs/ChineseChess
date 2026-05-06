"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameServer = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
const types_1 = require("../../../shared/types");
const chess_config_1 = require("../../../chess.config");
const logger_1 = require("./logger");
class GameServer {
    constructor(server, gameManager) {
        this.players = new Map();
        this.pingInterval = null;
        this.cleanupInterval = null;
        this.gameManager = gameManager;
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.setupWebSocketServer();
        this.startPingInterval();
        this.startCleanupInterval();
    }
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
                    logger_1.errorLogger.error('websocket_message_parse_error', {
                        playerId,
                        error: error instanceof Error ? error.message : String(error),
                    });
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
                type: types_1.MessageType.PONG,
                payload: { connected: true },
                timestamp: Date.now(),
                gameId: '',
            });
        });
    }
    handleMessage(player, message) {
        switch (message.type) {
            case types_1.MessageType.JOIN_GAME:
                this.handleJoinGame(player, message);
                break;
            case types_1.MessageType.MAKE_MOVE:
                this.handleMakeMove(player, message);
                break;
            case types_1.MessageType.LEAVE_GAME:
                this.handleLeaveGame(player, message);
                break;
            case types_1.MessageType.PING:
                this.handlePing(player);
                break;
            case types_1.MessageType.AI_MOVE:
                this.handleAIMove(player, message);
                break;
            default:
                this.sendError(player, 'Unknown message type');
        }
    }
    handleJoinGame(player, message) {
        const { gameId, side } = message.payload;
        let targetGameId = gameId;
        if (!targetGameId) {
            const newGame = this.gameManager.createGame(player.playerId);
            targetGameId = newGame.id;
        }
        const game = this.gameManager.joinGame(targetGameId, player.playerId, side);
        if (!game) {
            this.sendError(player, 'Failed to join game');
            return;
        }
        player.gameId = targetGameId;
        player.side = game.redPlayer === player.playerId ? types_1.Side.RED : types_1.Side.BLACK;
        (0, logger_1.logWebSocketEvent)('join_game', player.playerId, targetGameId, {
            side: player.side,
            isNewGame: !gameId,
        });
        for (const p of this.players.values()) {
            if (p.gameId === targetGameId) {
                const yourSide = game.redPlayer === p.playerId ? types_1.Side.RED : types_1.Side.BLACK;
                this.sendToPlayer(p, {
                    type: types_1.MessageType.GAME_STATE,
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
    handleMakeMove(player, message) {
        if (!player.gameId) {
            this.sendError(player, 'Not in a game');
            return;
        }
        const { from, to } = message.payload;
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
                const yourSide = game.redPlayer === p.playerId ? types_1.Side.RED : types_1.Side.BLACK;
                this.sendToPlayer(p, {
                    type: types_1.MessageType.GAME_STATE,
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
        if (game.status === types_1.GameStatus.FINISHED) {
            (0, logger_1.logWebSocketEvent)('game_over', player.playerId, player.gameId, {
                winner: game.winner,
                reason: 'general_captured',
            });
            this.broadcastToGame(player.gameId, {
                type: types_1.MessageType.GAME_OVER,
                payload: {
                    winner: game.winner,
                    reason: 'general_captured',
                },
                timestamp: Date.now(),
                gameId: player.gameId,
            });
        }
    }
    handleLeaveGame(player, message) {
        if (!player.gameId) {
            this.sendError(player, 'Not in a game');
            return;
        }
        const game = this.gameManager.leaveGame(player.gameId, player.playerId);
        if (game) {
            this.broadcastToGame(player.gameId, {
                type: types_1.MessageType.PLAYER_DISCONNECTED,
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
    handlePing(player) {
        player.lastPing = Date.now();
        this.sendToPlayer(player, {
            type: types_1.MessageType.PONG,
            payload: { timestamp: Date.now() },
            timestamp: Date.now(),
            gameId: player.gameId || '',
        });
    }
    handleAIMove(player, message) {
        if (!chess_config_1.chessConfig.ai.enabled) {
            this.sendError(player, 'AI is not enabled');
            return;
        }
        this.sendError(player, 'AI not yet implemented');
    }
    handleDisconnect(player) {
        if (player.gameId) {
            this.broadcastToGame(player.gameId, {
                type: types_1.MessageType.PLAYER_DISCONNECTED,
                payload: {
                    playerId: player.playerId,
                    message: 'Player disconnected',
                },
                timestamp: Date.now(),
                gameId: player.gameId,
            });
            setTimeout(() => {
                const reconnected = this.players.get(player.playerId);
                if (!reconnected || !reconnected.gameId) {
                    const game = this.gameManager.leaveGame(player.gameId, player.playerId);
                    if (game) {
                        (0, logger_1.logWebSocketEvent)('game_over_disconnect', player.playerId, player.gameId, {
                            winner: game.winner,
                            reason: 'player_disconnect',
                        });
                        this.broadcastToGame(player.gameId, {
                            type: types_1.MessageType.GAME_OVER,
                            payload: {
                                winner: game.winner,
                                reason: 'player_disconnect',
                            },
                            timestamp: Date.now(),
                            gameId: player.gameId,
                        });
                    }
                }
            }, chess_config_1.chessConfig.game.reconnectTimeoutMs);
        }
        this.players.delete(player.playerId);
    }
    sendToPlayer(player, message) {
        if (player.ws.readyState === ws_1.WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
    broadcastToGame(gameId, message) {
        for (const player of this.players.values()) {
            if (player.gameId === gameId) {
                this.sendToPlayer(player, message);
            }
        }
    }
    sendError(player, error) {
        this.sendToPlayer(player, {
            type: types_1.MessageType.ERROR,
            payload: { error },
            timestamp: Date.now(),
            gameId: player.gameId || '',
        });
    }
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
        };
    }
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
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            const cleaned = this.gameManager.cleanupInactiveGames(3600000);
            if (cleaned > 0) {
                console.log(`Cleaned up ${cleaned} inactive games`);
            }
        }, 600000);
    }
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