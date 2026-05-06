"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../../../shared/types");
const gameLogic_1 = require("../../../shared/gameLogic");
const gameLogger_1 = require("./gameLogger");
const chess_config_1 = require("../../../chess.config");
class GameManager {
    constructor() {
        this.games = new Map();
        this.playerGames = new Map();
        this.gameLogger = new gameLogger_1.GameLogger(chess_config_1.chessConfig.log.gameLogDir);
    }
    createGame(redPlayer) {
        const gameId = (0, uuid_1.v4)();
        const board = this.createInitialBoard();
        const game = {
            id: gameId,
            board,
            currentTurn: types_1.Side.RED,
            moves: [],
            status: types_1.GameStatus.WAITING,
            lastMoveTime: Date.now(),
            createdAt: Date.now(),
        };
        this.games.set(gameId, game);
        this.gameLogger.startGame(gameId, redPlayer);
        return game;
    }
    getGame(gameId) {
        return this.games.get(gameId);
    }
    joinGame(gameId, playerId, side) {
        const game = this.games.get(gameId);
        if (!game)
            return null;
        if (game.status !== types_1.GameStatus.WAITING) {
            return null;
        }
        if (side === types_1.Side.RED && game.redPlayer) {
            return null;
        }
        if (side === types_1.Side.BLACK && game.blackPlayer) {
            return null;
        }
        if (!side) {
            if (!game.redPlayer)
                side = types_1.Side.RED;
            else if (!game.blackPlayer)
                side = types_1.Side.BLACK;
            else
                return null;
        }
        if (side === types_1.Side.RED) {
            game.redPlayer = playerId;
        }
        else {
            game.blackPlayer = playerId;
        }
        this.playerGames.set(playerId, gameId);
        this.gameLogger.playerJoined(gameId, playerId, side);
        if (game.redPlayer && game.blackPlayer) {
            game.status = types_1.GameStatus.PLAYING;
        }
        return game;
    }
    makeMove(gameId, playerId, from, to) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }
        if (game.status !== types_1.GameStatus.PLAYING) {
            return { success: false, error: 'Game is not in progress' };
        }
        const isRedTurn = game.currentTurn === types_1.Side.RED;
        const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
        if (expectedPlayer !== playerId) {
            return { success: false, error: 'Not your turn' };
        }
        const piece = game.board[from.row][from.col];
        if (!piece) {
            return { success: false, error: 'No piece at source position' };
        }
        if (piece.side !== game.currentTurn) {
            return { success: false, error: 'Cannot move opponent piece' };
        }
        if (!(0, gameLogic_1.isValidMove)(game.board, piece, from, to)) {
            return { success: false, error: 'Invalid move' };
        }
        const capturedPiece = game.board[to.row][to.col];
        const move = {
            from: { ...from },
            to: { ...to },
            piece: { ...piece, position: { ...to } },
            capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
        };
        game.board[to.row][to.col] = { ...piece, position: { ...to } };
        game.board[from.row][from.col] = null;
        game.moves.push(move);
        game.currentTurn = isRedTurn ? types_1.Side.BLACK : types_1.Side.RED;
        game.lastMoveTime = Date.now();
        this.gameLogger.recordMove(gameId, move, game.moves.length, playerId, piece.side);
        const generalStatus = (0, gameLogic_1.isGeneralCaptured)(game.board);
        if (generalStatus.captured) {
            game.status = types_1.GameStatus.FINISHED;
            game.winner = generalStatus.winner;
            this.gameLogger.finishGame(gameId, generalStatus.winner, 'general_captured');
        }
        return { success: true, game };
    }
    leaveGame(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game)
            return null;
        const wasRedPlayer = game.redPlayer === playerId;
        if (wasRedPlayer) {
            game.redPlayer = undefined;
        }
        else if (game.blackPlayer === playerId) {
            game.blackPlayer = undefined;
        }
        this.playerGames.delete(playerId);
        if (game.status === types_1.GameStatus.PLAYING) {
            game.status = types_1.GameStatus.ABORTED;
            game.winner = wasRedPlayer ? types_1.Side.BLACK : types_1.Side.RED;
            this.gameLogger.abortGame(gameId, game.winner, 'player_disconnect');
        }
        if (!game.redPlayer && !game.blackPlayer) {
            this.games.delete(gameId);
            return null;
        }
        return game;
    }
    getPlayerGame(playerId) {
        const gameId = this.playerGames.get(playerId);
        if (!gameId)
            return undefined;
        return this.games.get(gameId);
    }
    createInitialBoard() {
        const board = Array(types_1.BOARD_ROWS)
            .fill(null)
            .map(() => Array(types_1.BOARD_COLS).fill(null));
        for (const piece of types_1.INITIAL_BOARD) {
            board[piece.position.row][piece.position.col] = { ...piece };
        }
        return board;
    }
    cleanupInactiveGames(maxAgeMs) {
        const now = Date.now();
        let cleaned = 0;
        for (const [gameId, game] of this.games.entries()) {
            if (game.status === types_1.GameStatus.FINISHED || game.status === types_1.GameStatus.ABORTED) {
                if (now - game.lastMoveTime > maxAgeMs) {
                    this.games.delete(gameId);
                    if (game.redPlayer)
                        this.playerGames.delete(game.redPlayer);
                    if (game.blackPlayer)
                        this.playerGames.delete(game.blackPlayer);
                    cleaned++;
                }
            }
        }
        return cleaned;
    }
    getAllGames() {
        return Array.from(this.games.values());
    }
}
exports.GameManager = GameManager;
//# sourceMappingURL=gameManager.js.map