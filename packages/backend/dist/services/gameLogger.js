"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("@chess/config");
const logger_1 = require("@chess/logger");
class GameLogger {
    activeGames = new Map();
    logDir;
    constructor(logDir = path_1.default.join(config_1.chessConfig.log.monorepoRoot, 'logs', 'games')) {
        this.logDir = logDir;
        this.ensureDirectories();
    }
    ensureDirectories() {
        const activeDir = path_1.default.join(this.logDir, 'active');
        const archiveDir = path_1.default.join(this.logDir, 'archive');
        if (!fs_1.default.existsSync(activeDir)) {
            fs_1.default.mkdirSync(activeDir, { recursive: true });
        }
        if (!fs_1.default.existsSync(archiveDir)) {
            fs_1.default.mkdirSync(archiveDir, { recursive: true });
        }
    }
    startGame(gameId, redPlayer) {
        const record = {
            gameId,
            createdAt: Date.now(),
            status: 'waiting',
            redPlayer,
            moves: [],
        };
        this.activeGames.set(gameId, record);
        this.saveGameRecord(gameId);
        (0, logger_1.logGameEvent)(gameId, 'game_started', redPlayer);
    }
    playerJoined(gameId, playerId, side) {
        const record = this.activeGames.get(gameId);
        if (!record)
            return;
        if (side === 'red') {
            record.redPlayer = playerId;
        }
        else {
            record.blackPlayer = playerId;
        }
        if (record.redPlayer && record.blackPlayer) {
            record.status = 'playing';
            record.startedAt = Date.now();
        }
        this.saveGameRecord(gameId);
        (0, logger_1.logGameEvent)(gameId, 'player_joined', playerId, { side });
    }
    recordMove(gameId, move, moveNumber, playerId, side) {
        const record = this.activeGames.get(gameId);
        if (!record)
            return;
        const moveRecord = {
            moveNumber,
            timestamp: Date.now(),
            playerId,
            side,
            from: move.from,
            to: move.to,
            pieceType: move.piece.type,
            capturedPieceType: move.capturedPiece?.type,
        };
        record.moves.push(moveRecord);
        this.saveGameRecord(gameId);
        (0, logger_1.logGameEvent)(gameId, 'move_recorded', playerId, {
            moveNumber,
            from: move.from,
            to: move.to,
            pieceType: move.piece.type,
        });
    }
    finishGame(gameId, winner, reason) {
        const record = this.activeGames.get(gameId);
        if (!record)
            return;
        record.status = 'finished';
        record.finishedAt = Date.now();
        record.winner = winner;
        record.winReason = reason;
        this.saveGameRecord(gameId);
        this.archiveGame(gameId);
        (0, logger_1.logGameEvent)(gameId, 'game_finished', record.redPlayer || '', { winner, reason });
    }
    abortGame(gameId, winner, reason) {
        const record = this.activeGames.get(gameId);
        if (!record)
            return;
        record.status = 'aborted';
        record.finishedAt = Date.now();
        record.winner = winner;
        record.winReason = reason;
        this.saveGameRecord(gameId);
        this.archiveGame(gameId);
        (0, logger_1.logGameEvent)(gameId, 'game_aborted', record.redPlayer || '', { winner, reason });
    }
    saveGameRecord(gameId) {
        const record = this.activeGames.get(gameId);
        if (!record)
            return;
        const filePath = path_1.default.join(this.logDir, 'active', `${gameId}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(record, null, 2));
    }
    archiveGame(gameId) {
        const activePath = path_1.default.join(this.logDir, 'active', `${gameId}.json`);
        const archivePath = path_1.default.join(this.logDir, 'archive', `${gameId}.json`);
        if (fs_1.default.existsSync(activePath)) {
            fs_1.default.renameSync(activePath, archivePath);
        }
        this.activeGames.delete(gameId);
    }
    getGameRecord(gameId) {
        return this.activeGames.get(gameId);
    }
    loadGameRecord(gameId) {
        const activePath = path_1.default.join(this.logDir, 'active', `${gameId}.json`);
        const archivePath = path_1.default.join(this.logDir, 'archive', `${gameId}.json`);
        let filePath = activePath;
        if (!fs_1.default.existsSync(activePath) && fs_1.default.existsSync(archivePath)) {
            filePath = archivePath;
        }
        if (!fs_1.default.existsSync(filePath))
            return undefined;
        try {
            const data = fs_1.default.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return undefined;
        }
    }
}
exports.GameLogger = GameLogger;
//# sourceMappingURL=gameLogger.js.map