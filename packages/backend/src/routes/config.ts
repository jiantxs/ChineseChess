import { Router } from 'express';
import { chessConfig } from '@chess/config';
import { getAllLayoutNames } from '../gameRecords.js';

const router = Router();

router.get('/config', (req, res) => {
  res.json({
    server: {
      port: chessConfig.server.port,
      host: chessConfig.server.host,
    },
    game: {
      defaultLayout: 'standard',
      availableLayouts: getAllLayoutNames(),
    },
    frontend: {
      buildOutput: chessConfig.frontend.buildOutput,
      devPort: chessConfig.frontend.devPort,
    },
    assets: {
      svgPath: chessConfig.assets.svgPath,
      staticPath: chessConfig.assets.staticPath,
    },
  });
});

export default router;
