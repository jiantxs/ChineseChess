import fs from 'fs';
import path from 'path';
import { Move, Side, Position, GameStatus } from '@chess/core';
import { chessConfig } from '@chess/config';
import { logGameEvent } from '@chess/logger';

export interface MoveRecord {
  moveNumber: number;
  timestamp: number;
  playerId: string;
  side: Side;
  from: Position;
  to: Position;
  pieceType: string;
  capturedPieceType?: string;
}

export interface GameRecord {
  gameId: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  status: GameStatus;
  redPlayer?: string;
  blackPlayer?: string;
  winner?: Side;
  winReason?: string;
  moves: MoveRecord[];
}

export class GameLogger {
  private activeGames: Map<string, GameRecord> = new Map();
  private logDir: string;

  constructor(logDir: string = path.join(chessConfig.log.monorepoRoot, 'logs', 'games')) {
    this.logDir = logDir;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const activeDir = path.join(this.logDir, 'active');
    const archiveDir = path.join(this.logDir, 'archive');
    
    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
  }

  startGame(gameId: string, redPlayer: string): void {
    const record: GameRecord = {
      gameId,
      createdAt: Date.now(),
      status: 'waiting' as GameStatus,
      redPlayer,
      moves: [],
    };

    this.activeGames.set(gameId, record);
    this.saveGameRecord(gameId);
    logGameEvent(gameId, 'game_started', redPlayer);
  }

  playerJoined(gameId: string, playerId: string, side: Side): void {
    const record = this.activeGames.get(gameId);
    if (!record) return;

    if (side === 'red') {
      record.redPlayer = playerId;
    } else {
      record.blackPlayer = playerId;
    }

    if (record.redPlayer && record.blackPlayer) {
      record.status = 'playing' as GameStatus;
      record.startedAt = Date.now();
    }

    this.saveGameRecord(gameId);
    logGameEvent(gameId, 'player_joined', playerId, { side });
  }

  recordMove(
    gameId: string,
    move: Move,
    moveNumber: number,
    playerId: string,
    side: Side
  ): void {
    const record = this.activeGames.get(gameId);
    if (!record) return;

    const moveRecord: MoveRecord = {
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
    logGameEvent(gameId, 'move_recorded', playerId, {
      moveNumber,
      from: move.from,
      to: move.to,
      pieceType: move.piece.type,
    });
  }

  finishGame(gameId: string, winner?: Side, reason?: string): void {
    const record = this.activeGames.get(gameId);
    if (!record) return;

    record.status = 'finished' as GameStatus;
    record.finishedAt = Date.now();
    record.winner = winner;
    record.winReason = reason;

    this.saveGameRecord(gameId);
    this.archiveGame(gameId);
    logGameEvent(gameId, 'game_finished', record.redPlayer || '', { winner, reason });
  }

  abortGame(gameId: string, winner?: Side, reason?: string): void {
    const record = this.activeGames.get(gameId);
    if (!record) return;

    record.status = 'aborted' as GameStatus;
    record.finishedAt = Date.now();
    record.winner = winner;
    record.winReason = reason;

    this.saveGameRecord(gameId);
    this.archiveGame(gameId);
    logGameEvent(gameId, 'game_aborted', record.redPlayer || '', { winner, reason });
  }

  private saveGameRecord(gameId: string): void {
    const record = this.activeGames.get(gameId);
    if (!record) return;

    const filePath = path.join(this.logDir, 'active', `${gameId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  }

  private archiveGame(gameId: string): void {
    const activePath = path.join(this.logDir, 'active', `${gameId}.json`);
    const archivePath = path.join(this.logDir, 'archive', `${gameId}.json`);

    if (fs.existsSync(activePath)) {
      fs.renameSync(activePath, archivePath);
    }

    this.activeGames.delete(gameId);
  }

  getGameRecord(gameId: string): GameRecord | undefined {
    return this.activeGames.get(gameId);
  }

  loadGameRecord(gameId: string): GameRecord | undefined {
    const activePath = path.join(this.logDir, 'active', `${gameId}.json`);
    const archivePath = path.join(this.logDir, 'archive', `${gameId}.json`);

    let filePath = activePath;
    if (!fs.existsSync(activePath) && fs.existsSync(archivePath)) {
      filePath = archivePath;
    }

    if (!fs.existsSync(filePath)) return undefined;

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as GameRecord;
    } catch {
      return undefined;
    }
  }
}
