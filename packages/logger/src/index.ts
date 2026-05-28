/**
 * @fileoverview 基于 Winston 的中国象棋应用程序日志模块。
 *
 * 使用 Winston 和每日轮转文件传输提供结构化日志记录，用于：
 *   - logs/requests/   (HTTP 请求日志)
 *   - logs/errors/     (错误日志)
 *   - logs/events/     (通用事件日志)
 *   - logs/games/      (按 gameId 分组的游戏特定事件日志)
 *
 * 多实例模式：每次 createLogger() 调用创建独立的日志实例。
 * 每个实例拥有独立的配置、日志文件目录和日志记录器。
 *
 * @module @chess/logger
 */
import path from 'path';
import fs from 'fs';
import type { ChessConfig } from '@chess/config';
import { EventType, LoggerInstance } from './types';
import { createRequestLogger, createErrorLogger, createEventLogger, createGameLogger } from './factories';
import { GameLoggerManager } from './game-manager';
import { createLoggerMethods } from './loggers';

export type { EventType, LoggerInstance };
export { createRequestLogger, createErrorLogger, createEventLogger, createGameLogger };
export { GameLoggerManager };
export { createLoggerMethods };
export type { LoggerMethods } from './loggers';

/**
 * 日志器工厂类 - 创建独立的日志实例
 *
 * 每个创建的实例拥有独立的：
 * - 配置副本
 * - 日志文件目录
 * - 日志记录器实例
 * - 游戏日志缓存
 *
 * @example
 * // 创建主服务器日志实例
 * const mainLogger = new LoggerFactory().createLogger(mainConfig);
 *
 * // 创建移动服务器日志实例
 * const mobileLogger = new LoggerFactory().createLogger(mobileConfig);
 *
 * // 两个实例独立运行，互不干扰
 * mainLogger.logSystemEvent('Main server started');
 * mobileLogger.logSystemEvent('Mobile server started');
 */
export class LoggerFactory {
  /**
   * 创建日志实例
   * @param config - ChessConfig 实例
   * @returns 日志实例接口
   */
  public createLogger(config: ChessConfig): LoggerInstance {
    const gameLogDir = path.join(config.log.monorepoRoot, 'logs', 'games');
    if (!fs.existsSync(gameLogDir)) {
      fs.mkdirSync(gameLogDir, { recursive: true });
    }

    const gameLoggerManager = new GameLoggerManager(config);
    const loggerMethods = createLoggerMethods(config, gameLoggerManager);

    return {
      requestLogger: createRequestLogger(config),
      errorLogger: createErrorLogger(config),
      globalEventLogger: createEventLogger(config),
      getGameLogger: (gameId: string) => gameLoggerManager.getGameLogger(gameId),
      clearGameLogger: (gameId?: string) => gameLoggerManager.clearGameLogger(gameId),
      ...loggerMethods,
    };
  }
}