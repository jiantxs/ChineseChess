/**
 * @fileoverview Configuration endpoint for frontend
 * @module backend/src/routes/config
 *
 * Provides server and game configuration to the frontend client.
 * Returns available layouts, server settings, and asset paths.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { chessConfig } from '@chess/config';
import { getAllLayoutNames, getAllLayouts } from '@chess/game-records';

/** Express router for configuration endpoint */
const router: Router = Router();

/**
 * Get server configuration and available layouts
 * @route GET /api/config
 * @description Returns comprehensive server configuration including:
 *              - Server port and host
 *              - Available game layouts with metadata
 *              - Frontend build settings
 *              - Asset paths for SVG pieces and static files
 *
 * @param req - Express request (no parameters required)
 * @param res - Express response containing configuration JSON
 * @returns JSON object with server, game, frontend, and assets configuration
 *
 * @example
 * // Response structure:
 * {
 *   "server": { "port": 3000, "host": "0.0.0.0" },
 *   "game": {
 *     "defaultLayout": "standard",
 *     "availableLayouts": ["standard", "dragon", "tiger", ...],
 *     "layouts": [{ "id": "standard", "name": "Standard", "description": "...", "tags": [...] }, ...]
 *   },
 *   "frontend": { "buildOutput": "...", "devPort": 5173 },
 *   "assets": { "svgPath": "...", "staticPath": "..." }
 * }
 */
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
