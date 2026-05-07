"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameManager = exports.GameManager = void 0;
const uuid_1 = require("uuid");
const types_1 = require("./types");
const gameLogic_1 = require("./gameLogic");
class GameManager {
    static instance;
    games = new Map();
    playerGames = new Map();
    constructor() { }
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    createGame(local = false) {
        for (const [gameId, game] of this.games.entries()) {
            if (game.status === types_1.GameStatus.PLAYING || game.status === types_1.GameStatus.WAITING) {
                game.status = types_1.GameStatus.FINISHED;
                game.winner = game.redPlayer ? types_1.Side.RED : types_1.Side.BLACK;
                if (game.redPlayer)
                    this.playerGames.delete(game.redPlayer);
                if (game.blackPlayer)
                    this.playerGames.delete(game.blackPlayer);
            }
        }
        const gameId = (0, uuid_1.v4)();
        const board = this.createInitialBoard();
        const game = {
            id: gameId,
            board,
            currentTurn: types_1.Side.RED,
            moves: [],
            status: local ? types_1.GameStatus.PLAYING : types_1.GameStatus.WAITING,
            lastMoveTime: Date.now(),
            createdAt: Date.now(),
            localGame: local,
        };
        this.games.set(gameId, game);
        return game;
    }
    getGame(gameId) {
        return this.games.get(gameId);
    }
    joinGame(gameId, playerId, side) {
        const game = this.games.get(gameId);
        if (!game)
            return null;
        if (game.status !== types_1.GameStatus.WAITING && !game.localGame) {
            return null;
        }
        // For local games, assign both sides to the same playerId
        if (game.localGame) {
            game.redPlayer = playerId;
            game.blackPlayer = playerId;
            this.playerGames.set(playerId, gameId);
            game.status = types_1.GameStatus.PLAYING;
            return game;
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
        if (!game.localGame) {
            const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
            if (expectedPlayer !== playerId) {
                return { success: false, error: 'Not your turn' };
            }
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
        const generalStatus = (0, gameLogic_1.isGeneralCaptured)(game.board);
        if (generalStatus.captured) {
            game.status = types_1.GameStatus.FINISHED;
            game.winner = generalStatus.winner;
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
    getValidMoves(gameId, playerId, position) {
        const game = this.games.get(gameId);
        if (!game)
            return [];
        const piece = game.board[position.row][position.col];
        if (!piece)
            return [];
        // For local games, both players can control any piece
        // For online games, only the player whose turn it is can move
        if (!game.localGame) {
            const isRedTurn = game.currentTurn === types_1.Side.RED;
            const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
            if (expectedPlayer !== playerId)
                return [];
        }
        if (piece.side !== game.currentTurn)
            return [];
        return (0, gameLogic_1.getValidMoves)(game.board, piece);
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
exports.gameManager = GameManager.getInstance();
//# sourceMappingURL=gameManager.js.map