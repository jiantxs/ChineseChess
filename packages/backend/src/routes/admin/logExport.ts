import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { ChessConfig } from '@chess/config';

import { LogType } from './utils';

/**
 * Creates a router for log export endpoints
 * @param config - The chess configuration
 * @returns Express router with /logs/export endpoint
 */
export function createLogExportRouter(config: ChessConfig): Router {
  const router = Router();

  /**
   * POST /logs/export
   * Exports logs as a ZIP archive
   */
  router.post('/', async (req, res) => {
    try {
      const body = req.body as { types?: LogType[]; gameIds?: string[] };

      let AdmZipConstructor: new () => import('adm-zip');
      try {
        const mod = await import('adm-zip');
        AdmZipConstructor = mod.default as new () => import('adm-zip');
      } catch {
        res.status(500).json({ error: 'ZIP library not available. Install adm-zip to enable exports.' });
        return;
      }

      const zip = new AdmZipConstructor();

      const logTypes: LogType[] = ['requests', 'errors', 'events', 'games'];
      const typesToExport = body.types?.filter(t => logTypes.includes(t)) || logTypes;

      for (const type of typesToExport) {
        let baseDir: string;
        if (type === 'games') {
          baseDir = config.log.gameLogDir;
        } else if (type === 'events') {
          baseDir = path.join(path.dirname(config.log.gameLogDir), 'events');
        } else {
          const dirMap: Record<string, string> = {
            requests: config.log.requestLogDir,
            errors: config.log.errorLogDir,
          };
          baseDir = dirMap[type];
        }

        try {
          const entries = await fs.readdir(baseDir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.log')) {
              const fullPath = path.join(baseDir, entry.name);

              const resolvedPath = path.resolve(fullPath);
              const resolvedDir = path.resolve(baseDir);
              if (!resolvedPath.startsWith(resolvedDir)) {
                continue;
              }

              const content = await fs.readFile(fullPath);
              const archivePath = type === 'games'
                ? `games/${path.basename(path.dirname(resolvedPath))}/${entry.name}`
                : `${type}/${entry.name}`;
              zip.addFile(archivePath, content);
            } else if (entry.isDirectory() && type === 'games') {
              const gameDir = path.join(baseDir, entry.name);

              if (body.gameIds && !body.gameIds.includes(entry.name)) {
                continue;
              }

              const gameFiles = await fs.readdir(gameDir, { withFileTypes: true });
              for (const gameFile of gameFiles) {
                if (gameFile.isFile() && gameFile.name.endsWith('.log')) {
                  const fullPath = path.join(gameDir, gameFile.name);
                  const content = await fs.readFile(fullPath);
                  zip.addFile(`games/${entry.name}/${gameFile.name}`, content);
                }
              }
            }
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Error adding ${type} to ZIP:`, err);
          }
        }
      }

      const zipBuffer = zip.toBuffer();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.zip"`);
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
    } catch (err) {
      console.error('Error exporting logs:', err);
      res.status(500).json({ error: 'Failed to export logs' });
    }
  });

  return router;
}