/**
 * @fileoverview Express server entry point for Chinese Chess backend
 * @module backend/src/index
 *
 * Sets up Express HTTP server with WebSocket support for real-time multiplayer Chinese Chess.
 * Handles session middleware, static file serving, API routes, and graceful shutdown.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import express from 'express';
import { createServer } from 'http';
import { chessConfig } from '@chess/config';
import { GameServer } from './services/gameServer';
import { gameManager } from '@chess/core';
import { createAppRouter } from './routes';
import { requestLogger, logSystemEvent } from './services/logger';

/** Express application instance */
const app = express();

/** HTTP server instance wrapping Express app */
const server = createServer(app);

/** URL prefix from configuration (e.g., '/aabbcc') */
const PREFIX = chessConfig.server.prefix;

// Create and mount the application router
const appRouter = createAppRouter();

if (PREFIX) {
  app.use(PREFIX, appRouter);
  logSystemEvent('Routes mounted at prefix', { prefix: PREFIX });
} else {
  app.use(appRouter);
}

/**
 * WebSocket game server instance
 * @remarks Handles real-time multiplayer game logic via /ws path
 * @see {@link GameServer}
 */
const gameServer = new GameServer(server, gameManager, PREFIX);

// Store gameServer reference in app locals for access by routes
app.locals.gameServer = gameServer;

/** Server port from configuration (default: 3000) */
const PORT = chessConfig.server.port;

/** Server host from configuration (default: 0.0.0.0) */
const HOST = chessConfig.server.host;

/**
 * Start HTTP and WebSocket servers
 * @remarks Begins listening on configured port and host, logs startup message
 */
server.listen(PORT, HOST, () => {
  requestLogger.info('server_started', { host: HOST, port: PORT, prefix: PREFIX });
  logSystemEvent('Chinese Chess server started', { host: HOST, port: PORT, url: `http://${HOST}:${PORT}${PREFIX}` });
});

/**
 * Graceful shutdown handler
 * @remarks Listens for SIGTERM signal, stops GameServer intervals, closes HTTP server,
 * then exits process cleanly. Ensures proper cleanup of WebSocket connections and timers.
 * @param signal - The signal received (SIGTERM)
 */
process.on('SIGTERM', () => {
  logSystemEvent('SIGTERM received, shutting down gracefully');
  gameServer.stop();
  server.close(() => {
    logSystemEvent('Server closed');
    process.exit(0);
  });
});
