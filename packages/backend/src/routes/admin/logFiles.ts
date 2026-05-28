import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { ChessConfig } from '@chess/config';

import { LogType, LogFileInfo, getLogDir } from './utils';

/**
 * Creates a router for log file listing endpoints
 * @param config - The chess configuration
 * @returns Express router with /logs/files endpoint
 */
export function createLogFilesRouter(config: ChessConfig): Router {
  const router = Router();

  /**
   * GET /logs/files
   * Lists all available log files with metadata
   */
  router.get('/', async (req, res) => {
    try {
      const query = req.query as { type?: LogType; gameId?: string };
      const files: LogFileInfo[] = [];

      const logTypes: LogType[] = ['requests', 'errors', 'events', 'games'];
      const dirsToScan = logTypes.map(t => {
        let dir: string;
        if (t === 'games') {
          dir = config.log.gameLogDir;
        } else if (t === 'events') {
          dir = path.join(path.dirname(config.log.gameLogDir), 'events');
        } else {
          const dirMap: Record<string, string> = {
            requests: config.log.requestLogDir,
            errors: config.log.errorLogDir,
          };
          dir = dirMap[t];
        }
        return { type: t as LogType, dir };
      });

      for (const { type, dir } of dirsToScan) {
        if (query.type && query.type !== type) {
          continue;
        }

        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.log')) {
              const fullPath = path.join(dir, entry.name);
              const stats = await fs.stat(fullPath);

              let gameId: string | undefined;
              if (type === 'games') {
                gameId = path.basename(dir);
              }

              if (query.gameId && type === 'games' && gameId !== query.gameId) {
                continue;
              }

              files.push({
                name: entry.name,
                path: fullPath,
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
                type,
                gameId,
              });
            }
          }

          if (type === 'games' && !query.gameId) {
            const subdirs = await fs.readdir(dir, { withFileTypes: true });
            for (const subdir of subdirs) {
              if (subdir.isDirectory()) {
                const gameDir = path.join(dir, subdir.name);
                const gameFiles = await fs.readdir(gameDir, { withFileTypes: true });

                for (const gameFile of gameFiles) {
                  if (gameFile.isFile() && gameFile.name.endsWith('.log')) {
                    const fullPath = path.join(gameDir, gameFile.name);
                    const stats = await fs.stat(fullPath);

                    files.push({
                      name: gameFile.name,
                      path: fullPath,
                      size: stats.size,
                      modifiedAt: stats.mtime.toISOString(),
                      type,
                      gameId: subdir.name,
                    });
                  }
                }
              }
            }
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Error scanning directory ${dir}:`, err);
          }
        }
      }

      files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

      res.json({ files, total: files.length });
    } catch (err) {
      console.error('Error listing log files:', err);
      res.status(500).json({ error: 'Failed to list log files' });
    }
  });

  return router;
}