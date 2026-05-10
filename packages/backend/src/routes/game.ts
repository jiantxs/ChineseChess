/**
 * @fileoverview Player ID endpoint for session-based identity
 * @module backend/src/routes/game
 *
 * Provides session-based player identification for Chinese Chess multiplayer.
 * Generates UUID player IDs and stores them in Express session.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';

/** Express router for game-related endpoints */
const router: ExpressRouter = Router();

/**
 * Generate a new player ID for session-based identity
 * @route POST /api/game/player-id
 * @description Creates a UUID playerId and stores it in the session.
 *              Used by clients to establish WebSocket connection identity.
 *
 * @param req - Express request (session must be initialized)
 * @param res - Express response containing the generated playerId
 * @returns JSON with playerId property
 *
 * @example
 * // Request
 * POST /api/game/player-id
 *
 * // Response
 * { "playerId": "550e8400-e29b-41d4-a716-446655440000" }
 */
router.post('/player-id', (req, res) => {
  const playerId = uuidv4();
  (req.session as any).playerId = playerId;
  res.json({ playerId });
});

/**
 * Exit game and shutdown server
 * @route POST /api/game/exit
 * @description Receives exit request from frontend, responds with success,
 *              then gracefully shuts down the server process.
 *
 * @param req - Express request
 * @param res - Express response confirming shutdown initiation
 * @returns JSON with success message
 *
 * @example
 * // Request
 * POST /api/game/exit
 *
 * // Response
 * { "message": "Server is shutting down" }
 */
router.post('/exit', (req, res) => {
  res.json({ message: 'Server is shutting down' });

  // Allow response to be sent before shutting down
  setTimeout(() => {
    const gameServer = (req as any).app.locals.gameServer;
    if (gameServer && typeof gameServer.stop === 'function') {
      gameServer.stop();
    }
    process.exit(0);
  }, 100);
});

export default router;
