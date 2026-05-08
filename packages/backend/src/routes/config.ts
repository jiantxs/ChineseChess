import { Router } from 'express';
import { chessConfig } from '@chess/config';
import { getAllLayoutNames, getAllLayouts } from '@chess/game-records';

const router = Router();

router.get('/config', (req, res) => {
  const layouts = getAllLayouts();
  res.json({
    server: {
      port: chessConfig.server.port,
      host: chessConfig.server.host,
    },
    game: {
      defaultLayout: 'standard',
      availableLayouts: getAllLayoutNames(),
      layouts: layouts.map((l: { id: string; name: string; description: string; tags: string[] }) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        tags: l.tags,
      })),
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
