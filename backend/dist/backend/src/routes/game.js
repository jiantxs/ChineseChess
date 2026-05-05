"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
router.post('/player-id', (req, res) => {
    const playerId = (0, uuid_1.v4)();
    req.session.playerId = playerId;
    res.json({ playerId });
});
exports.default = router;
//# sourceMappingURL=game.js.map