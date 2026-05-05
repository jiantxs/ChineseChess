"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGameManager = setGameManager;
const express_1 = require("express");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
let gameManager;
function setGameManager(manager) {
    gameManager = manager;
}
function getGameManager() {
    if (!gameManager) {
        throw new Error('GameManager not initialized');
    }
    return gameManager;
}
router.post('/create', (req, res) => {
    const game = getGameManager().createGame();
    res.json({ gameId: game.id, status: game.status });
});
router.get('/:gameId', (req, res) => {
    const game = getGameManager().getGame(req.params.gameId);
    if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
    }
    res.json(game);
});
router.post('/:gameId/join', (req, res) => {
    const { playerId, side } = req.body;
    if (!playerId) {
        res.status(400).json({ error: 'playerId required' });
        return;
    }
    const game = getGameManager().joinGame(req.params.gameId, playerId, side);
    if (!game) {
        res.status(400).json({ error: 'Failed to join game' });
        return;
    }
    res.json({ success: true, game });
});
router.post('/player-id', (req, res) => {
    const playerId = (0, uuid_1.v4)();
    req.session.playerId = playerId;
    res.json({ playerId });
});
exports.default = router;
//# sourceMappingURL=game.js.map