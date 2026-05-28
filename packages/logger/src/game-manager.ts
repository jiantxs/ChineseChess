/**
 * @fileoverview 游戏日志管理器 - 管理 gameLoggers 缓存
 * @module @chess/logger
 */
import winston from 'winston';
import type { ChessConfig } from '@chess/config';
import { createGameLogger } from './factories';

export class GameLoggerManager {
  private gameLoggers: Map<string, winston.Logger> = new Map();
  private config: ChessConfig;

  constructor(config: ChessConfig) {
    this.config = config;
  }

  getGameLogger(gameId: string): winston.Logger {
    let logger = this.gameLoggers.get(gameId);
    if (!logger) {
      logger = createGameLogger(this.config, gameId);
      this.gameLoggers.set(gameId, logger);
    }
    return logger;
  }

  clearGameLogger(gameId?: string): void {
    if (gameId) {
      this.gameLoggers.delete(gameId);
    } else {
      this.gameLoggers.clear();
    }
  }
}