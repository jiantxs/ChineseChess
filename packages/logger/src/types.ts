/**
 * @fileoverview 日志模块类型定义
 * @module @chess/logger
 */
import type winston from 'winston';

/**
 * 分类日志的事件类型
 * @enum {string}
 */
export type EventType = 'GAME' | 'HTTP' | 'WEBSOCKET' | 'SYSTEM' | 'ERROR';

/**
 * 日志实例接口 - 提供创建独立日志实例的工厂方法
 */
export interface LoggerInstance {
  requestLogger: winston.Logger;
  errorLogger: winston.Logger;
  globalEventLogger: winston.Logger;
  getGameLogger: (gameId: string) => winston.Logger;
  clearGameLogger: (gameId?: string) => void;
  logGameLifecycle: (gameId: string, action: string, metadata?: Record<string, unknown>) => void;
  logWebSocketEvent: (event: string, playerId: string, gameId?: string, details?: Record<string, unknown>) => void;
  logHttpRequest: (method: string, url: string, path: string, statusCode: number, duration: number, ip?: string, userAgent?: string, playerId?: string | null) => void;
  logError: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  logEvent: (eventType: EventType, source: string, metadata?: Record<string, unknown>, playerId?: string, gameId?: string) => void;
  logGameEvent: (gameId: string, action: string, playerId: string, metadata?: Record<string, unknown>) => void;
  logSystemEvent: (message: string, metadata?: Record<string, unknown>) => void;
  logClientLogEvent: (level: string, message: string, timestamp: number, metadata?: Record<string, unknown>, playerId?: string, gameId?: string) => void;
}