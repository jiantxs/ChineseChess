"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
/** Express router for game-related endpoints */
const router = (0, express_1.Router)();
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
    const playerId = (0, uuid_1.v4)();
    req.session.playerId = playerId;
    res.json({ playerId });
});
exports.default = router;
//# sourceMappingURL=game.js.map