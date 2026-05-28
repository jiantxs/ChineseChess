/**
 * @fileoverview 日志方法实现 - 所有 log*Internal 方法
 * @module @chess/logger
 */
import type winston from 'winston';
import type { ChessConfig } from '@chess/config';
import type { EventType } from './types';
import { createRequestLogger, createErrorLogger, createEventLogger } from './factories';
import { GameLoggerManager } from './game-manager';

export interface LoggerMethods {
  logGameLifecycle: (gameId: string, action: string, metadata?: Record<string, unknown>) => void;
  logWebSocketEvent: (event: string, playerId: string, gameId?: string, details?: Record<string, unknown>) => void;
  logHttpRequest: (method: string, url: string, p: string, statusCode: number, duration: number, ip?: string, userAgent?: string, playerId?: string | null) => void;
  logError: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  logEvent: (eventType: EventType, source: string, metadata?: Record<string, unknown>, playerId?: string, gameId?: string) => void;
  logGameEvent: (gameId: string, action: string, playerId: string, metadata?: Record<string, unknown>) => void;
  logSystemEvent: (message: string, metadata?: Record<string, unknown>) => void;
  logClientLogEvent: (level: string, message: string, timestamp: number, metadata?: Record<string, unknown>, playerId?: string, gameId?: string) => void;
}

export function createLoggerMethods(
  config: ChessConfig,
  gameLoggerManager: GameLoggerManager
): LoggerMethods {
  const logGameLifecycleInternal = (
    gameId: string,
    action: string,
    metadata: Record<string, unknown> = {}
  ): void => {
    const gameLogger = gameLoggerManager.getGameLogger(gameId);

    const eventData = {
      action,
      gameId,
      timestamp: Date.now(),
      ...metadata,
    };

    switch (action) {
      case 'created':
        gameLogger.info('game_created', eventData);
        break;
      case 'move':
        gameLogger.info('game_move', eventData);
        break;
      case 'finished':
        gameLogger.info('game_finished', eventData);
        break;
      case 'aborted':
        gameLogger.warn('game_aborted', eventData);
        break;
      default:
        gameLogger.info('game_event', eventData);
    }

    const globalEventLogger = createEventLogger(config);
    globalEventLogger.info('game_event', {
      eventType: 'GAME',
      source: 'core',
      gameId,
      action,
      ...metadata,
    });
  };

  const logWebSocketEventInternal = (
    event: string,
    playerId: string,
    gameId: string | undefined,
    details: Record<string, unknown> | undefined
  ): void => {
    const requestLogger = createRequestLogger(config);
    const globalEventLogger = createEventLogger(config);

    requestLogger.info('websocket_event', {
      event,
      playerId,
      gameId: gameId || null,
      ...details,
    });
    globalEventLogger.info('event', {
      eventType: 'WEBSOCKET',
      source: 'backend',
      playerId,
      gameId: gameId || null,
      ...details,
    });
  };

  const logHttpRequestInternal = (
    method: string,
    url: string,
    p: string,
    statusCode: number,
    duration: number,
    ip: string | undefined,
    userAgent: string | undefined,
    playerId: string | null | undefined
  ): void => {
    const requestLogger = createRequestLogger(config);
    const globalEventLogger = createEventLogger(config);

    requestLogger.info('http_request', {
      method,
      url,
      path: p,
      statusCode,
      duration,
      ip,
      userAgent,
      playerId,
    });
    globalEventLogger.info('event', {
      eventType: 'HTTP',
      source: 'backend',
      playerId: playerId || null,
      method,
      path: p,
      statusCode,
      duration,
    });
  };

  const logErrorInternal = (
    message: string,
    error: Error | undefined,
    context: Record<string, unknown> | undefined
  ): void => {
    const errorLogger = createErrorLogger(config);
    const globalEventLogger = createEventLogger(config);

    errorLogger.error(message, {
      error: error?.message || error?.toString(),
      stack: error?.stack,
      ...context,
    });
    globalEventLogger.error('event', {
      eventType: 'ERROR',
      source: 'backend',
      message,
      error: error?.message || error?.toString(),
      ...context,
    });
  };

  const logEventInternal = (
    eventType: EventType,
    source: string,
    metadata: Record<string, unknown> = {},
    playerId: string | undefined,
    gameId: string | undefined
  ): void => {
    const globalEventLogger = createEventLogger(config);
    globalEventLogger.info('event', {
      timestamp: Date.now(),
      eventType,
      source,
      playerId: playerId || null,
      gameId: gameId || null,
      ...metadata,
    });
  };

  const logGameEventInternal = (
    gameId: string,
    action: string,
    playerId: string,
    metadata: Record<string, unknown> | undefined
  ): void => {
    logEventInternal('GAME', 'backend', { action, ...metadata }, playerId, gameId);
  };

  const logSystemEventInternal = (
    message: string,
    metadata: Record<string, unknown> | undefined
  ): void => {
    logEventInternal('SYSTEM', 'backend', { message, ...metadata }, undefined, undefined);
  };

  const logClientLogEventInternal = (
    level: string,
    message: string,
    timestamp: number,
    metadata: Record<string, unknown> | undefined,
    playerId: string | undefined,
    gameId: string | undefined
  ): void => {
    const globalEventLogger = createEventLogger(config);
    const errorLogger = createErrorLogger(config);

    const logData = {
      eventType: 'CLIENT',
      source: 'frontend',
      clientTimestamp: timestamp,
      level,
      message,
      playerId: playerId || null,
      gameId: gameId || null,
      ...metadata,
    };

    switch (level) {
      case 'error':
        globalEventLogger.error('client_log', logData);
        errorLogger.error('client_log', logData);
        break;
      case 'warn':
        globalEventLogger.warn('client_log', logData);
        break;
      case 'debug':
        globalEventLogger.debug('client_log', logData);
        break;
      default:
        globalEventLogger.info('client_log', logData);
    }
  };

  return {
    logGameLifecycle: logGameLifecycleInternal,
    logWebSocketEvent: logWebSocketEventInternal,
    logHttpRequest: logHttpRequestInternal,
    logError: logErrorInternal,
    logEvent: logEventInternal,
    logGameEvent: logGameEventInternal,
    logSystemEvent: logSystemEventInternal,
    logClientLogEvent: logClientLogEventInternal,
  };
}