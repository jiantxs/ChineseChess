/**
 * @fileoverview Winston 日志器服务 - 纯新API，无遗留代码
 * @module backend/src/services/logger
 *
 * 提供日志服务，基于注入的 LoggerInstance。
 * 用于记录 HTTP 请求和 WebSocket 事件的自定义中间件和辅助函数。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import type { LoggerInstance } from '@chess/logger';
import type express from 'express';

/**
 * 日志服务接口 - 提供实例化的日志功能
 */
export interface LoggerService {
  requestLogger: LoggerInstance['requestLogger'];
  errorLogger: LoggerInstance['errorLogger'];
  globalEventLogger: LoggerInstance['globalEventLogger'];
  logWebSocketEvent: LoggerInstance['logWebSocketEvent'];
  logHttpRequest: LoggerInstance['logHttpRequest'];
  logError: LoggerInstance['logError'];
  logEvent: LoggerInstance['logEvent'];
  logGameEvent: LoggerInstance['logGameEvent'];
  logGameLifecycle: LoggerInstance['logGameLifecycle'];
  logSystemEvent: LoggerInstance['logSystemEvent'];
  logClientLogEvent: LoggerInstance['logClientLogEvent'];
  getGameLogger: LoggerInstance['getGameLogger'];
  clearGameLogger: LoggerInstance['clearGameLogger'];
  requestLogMiddleware: () => express.RequestHandler;
}

/**
 * 创建日志服务实例
 * @param loggerInstance - 日志实例（必填）
 * @returns 日志服务接口
 *
 * @example
 * const logger = new LoggerFactory().createLogger(config);
 * const loggerService = createLoggerService(logger);
 * loggerService.logSystemEvent('Server started');
 * app.use(loggerService.requestLogMiddleware());
 */
export function createLoggerService(loggerInstance: LoggerInstance): LoggerService {
  return {
    requestLogger: loggerInstance.requestLogger,
    errorLogger: loggerInstance.errorLogger,
    globalEventLogger: loggerInstance.globalEventLogger,

    logWebSocketEvent: (event, playerId, gameId, details) => {
      loggerInstance.logWebSocketEvent(event, playerId, gameId, details);
    },

    logHttpRequest: (method, url, path, statusCode, duration, ip, userAgent, playerId) => {
      loggerInstance.logHttpRequest(method, url, path, statusCode, duration, ip, userAgent, playerId);
    },

    logError: (message, error, context) => {
      loggerInstance.logError(message, error, context);
    },

    logEvent: (eventType, source, metadata, playerId, gameId) => {
      loggerInstance.logEvent(eventType, source, metadata, playerId, gameId);
    },

    logGameEvent: (gameId, action, playerId, metadata) => {
      loggerInstance.logGameEvent(gameId, action, playerId, metadata);
    },

    logGameLifecycle: (gameId, action, metadata) => {
      loggerInstance.logGameLifecycle(gameId, action, metadata);
    },

    logSystemEvent: (message, metadata) => {
      loggerInstance.logSystemEvent(message, metadata);
    },

    logClientLogEvent: (level, message, timestamp, metadata, playerId, gameId) => {
      loggerInstance.logClientLogEvent(level, message, timestamp, metadata, playerId, gameId);
    },

    getGameLogger: (gameId) => {
      return loggerInstance.getGameLogger(gameId);
    },

    clearGameLogger: (gameId) => {
      loggerInstance.clearGameLogger(gameId);
    },

    requestLogMiddleware: () => {
      return (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
          const duration = Date.now() - start;
          const playerId = (req.session as any)?.playerId || null;
          loggerInstance.logHttpRequest(
            req.method,
            req.url,
            req.path,
            res.statusCode,
            duration,
            req.ip || req.socket.remoteAddress,
            req.get('user-agent'),
            playerId
          );
        });

        next();
      };
    },
  };
}