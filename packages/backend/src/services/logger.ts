import {
  requestLogger,
  errorLogger,
  globalEventLogger,
  logHttpRequest,
  logError,
  logEvent,
  logGameEvent,
  logSystemEvent,
} from '@chess/logger';
import type express from 'express';

export {
  requestLogger,
  errorLogger,
  globalEventLogger,
  logHttpRequest,
  logError,
  logEvent,
  logGameEvent,
  logSystemEvent,
};

function logWebSocketEvent(
  event: string,
  playerId: string,
  gameId?: string,
  details?: Record<string, unknown>
): void {
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
}

export { logWebSocketEvent };

export function requestLogMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const playerId = (req.session as any)?.playerId || null;
      logHttpRequest(
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
}