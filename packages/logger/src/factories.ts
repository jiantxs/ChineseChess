/**
 * @fileoverview 日志器工厂函数 - 创建独立的日志实例
 * @module @chess/logger
 */
import winston from 'winston';
import type { ChessConfig } from '@chess/config';
import { createTransports } from './transports';

/**
 * 创建请求日志器
 */
export const createRequestLogger = (config: ChessConfig): winston.Logger =>
  winston.createLogger({
    level: config.log.level,
    defaultMeta: { service: 'chess-server' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: createTransports(config, 'requests', 'request-%DATE%.log', 'debug'),
  });

/**
 * 创建错误日志器
 */
export const createErrorLogger = (config: ChessConfig): winston.Logger =>
  winston.createLogger({
    level: 'error',
    defaultMeta: { service: 'chess-server' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: createTransports(config, 'errors', 'error-%DATE%.log', 'error'),
  });

/**
 * 创建事件日志器
 */
export const createEventLogger = (config: ChessConfig): winston.Logger =>
  winston.createLogger({
    level: config.log.level,
    defaultMeta: { service: 'chess-events' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: createTransports(config, 'events', 'events-%DATE%.log', 'debug'),
  });

/**
 * 创建游戏日志器
 */
export const createGameLogger = (config: ChessConfig, gameId: string): winston.Logger => {
  const gameLogSubdir = `games/${gameId}`;

  return winston.createLogger({
    level: config.log.level,
    defaultMeta: { service: 'chess-game', gameId },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: createTransports(config, gameLogSubdir, '%DATE%.log', 'debug'),
  });
};