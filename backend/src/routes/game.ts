import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/player-id', (req, res) => {
  const playerId = uuidv4();
  (req.session as any).playerId = playerId;
  res.json({ playerId });
});

export default router;
