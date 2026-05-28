import { Router } from 'express';
import type { ChessConfig } from '@chess/config';

import { createLogsRouter } from './logs';
import { createLogFilesRouter } from './logFiles';
import { createLogExportRouter } from './logExport';

/**
 * Creates the admin router combining all admin routes
 * @param config - The chess configuration
 * @returns Express router with all admin endpoints
 */
export function createAdminRouter(config: ChessConfig): Router {
  const router = Router();

  router.use('/logs', createLogsRouter(config));
  router.use('/logs/files', createLogFilesRouter(config));
  router.use('/logs/export', createLogExportRouter(config));

  return router;
}

// Re-export types for backward compatibility
export type { LogType, LogQuery, LogFileInfo, ParsedLogEntry } from './utils';

// Default export
export default createAdminRouter;