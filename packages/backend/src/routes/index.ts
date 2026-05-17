/**
 * @fileoverview Express router with all application routes and middleware
 * @module backend/src/routes/index
 *
 * Consolidates all Express middleware and routes into a single router
 * that can be mounted at a configurable prefix path.
 */

import { Router } from 'express';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { chessConfig } from '@chess/config';
import { gameManager } from '@chess/core';
import gameRoutes from './game';
import configRoutes from './config';
import { requestLogMiddleware, logError } from '../services/logger';

/**
 * Creates and configures the main application router with all middleware and routes.
 * This router can be mounted at any prefix path in the main Express app.
 *
 * @returns Configured Express Router instance
 */
export function createAppRouter(): Router {
  const router = Router();

  // Middleware: Parse JSON request bodies
  router.use(express.json());

  // Middleware: Log all HTTP requests using Winston
  router.use(requestLogMiddleware());

  // Middleware: Session management for player identity
  router.use(
    session({
      secret: chessConfig.server.sessionSecret,
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: chessConfig.server.sessionMaxAgeMs,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
      },
    })
  );

  // Mount game routes at /api/game - handles player ID generation
  router.use('/api/game', gameRoutes);

  // Mount config routes at /api - returns server configuration and layouts
  router.use('/api', configRoutes);

  // Store game manager reference in router locals for access by routes
  router.use((req, res, next) => {
    (req as any).app.locals.gameManager = gameManager;
    next();
  });

  // Path to frontend build output directory
  const publicPath = path.resolve(__dirname, '../../node_modules/@chess/frontend/dist');

  // Middleware: Serve static files from frontend build directory
  router.use(express.static(publicPath));

  // Catch-all route for SPA navigation
  router.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Global error handling middleware
  router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logError('Unhandled error in Express router', err, { path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
}
