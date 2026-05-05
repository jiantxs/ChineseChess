import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from '../services/gameManager';

const router = Router();

let gameManager: GameManager | undefined;

export function setGameManager(manager: GameManager) {
  gameManager = manager;
}

function getGameManager(): GameManager {
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
  const playerId = uuidv4();
  (req.session as any).playerId = playerId;
  res.json({ playerId });
});

export default router;
