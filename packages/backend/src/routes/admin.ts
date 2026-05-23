import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { chessConfig } from '@chess/config';

type LogType = 'requests' | 'errors' | 'events' | 'games';

interface LogQuery {
  type?: LogType;
  date?: string;
  gameId?: string;
  limit?: string;
  offset?: string;
}

interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  type: LogType;
  gameId?: string;
}

interface ParsedLogEntry {
  timestamp?: string;
  level?: string;
  message?: string;
  // Allow any additional fields from the raw log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function sanitizeLogType(type: string): LogType | null {
  const validTypes: LogType[] = ['requests', 'errors', 'events', 'games'];
  if (validTypes.includes(type as LogType)) {
    return type as LogType;
  }
  return null;
}

function sanitizePath(basePath: string, userPath: string): string {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(basePath, normalized);
}

function createAdminRouter(): Router {
  const router = Router();

  router.get('/logs', async (req, res) => {
    try {
      const query = req.query as LogQuery;

      if (!query.type) {
        res.status(400).json({ error: 'Missing required query parameter: type' });
        return;
      }

      const logType = sanitizeLogType(query.type);
      if (!logType) {
        res.status(400).json({ error: 'Invalid log type. Must be one of: requests, errors, events, games' });
        return;
      }

      const date = query.date || new Date().toISOString().split('T')[0];
      if (!isValidDate(date)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
      }

      const limit = Math.min(parseInt(query.limit || '100', 10), 1000);
      const offset = parseInt(query.offset || '0', 10);

      let logDir: string;
      if (logType === 'games') {
        if (!query.gameId) {
          res.status(400).json({ error: 'gameId is required for games log type' });
          return;
        }
        const sanitizedGameId = query.gameId.replace(/[^a-zA-Z0-9-_]/g, '');
        logDir = path.join(chessConfig.log.gameLogDir, sanitizedGameId);
      } else {
        const dirMap: Record<string, string> = {
          requests: chessConfig.log.requestLogDir,
          errors: chessConfig.log.errorLogDir,
          events: chessConfig.log.gameLogDir.replace('/games', '/events'),
        };
        logDir = dirMap[logType];
      }

      const fileNameMap: Record<string, string> = {
        requests: 'request',
        errors: 'error',
        events: 'events',
        games: '',
      };
      const filePrefix = fileNameMap[logType];
      const fileName = logType === 'games'
        ? `${date}.log`
        : `${filePrefix}-${date}.log`;
      const filePath = sanitizePath(logDir, fileName);

      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(logDir);
      if (!resolvedPath.startsWith(resolvedDir)) {
        res.status(400).json({ error: 'Invalid file path' });
        return;
      }

      let fileContent: string;
      try {
        fileContent = await fs.readFile(filePath, 'utf-8');
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          res.json({ logs: [], total: 0, hasMore: false, availableDates: [] });
          return;
        }
        throw err;
      }

      const entries: ParsedLogEntry[] = [];
      const lines = fileContent.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const raw = JSON.parse(line) as Record<string, unknown>;
          const level = (raw.level as string) || 'unknown';
          let message = (raw.message as string) || '';
          const action = (raw.action as string) || '';

          const genericMessages = ['event', 'game_event', 'client_log'];
          if (!message || genericMessages.includes(message)) {
            message = action || `${raw.eventType || 'log'}: ${JSON.stringify(raw).slice(0, 500)}`;
          }

          if (!message) {
            message = JSON.stringify(raw).slice(0, 500);
          }

          const entry: ParsedLogEntry = {
            timestamp: (raw.timestamp as string) || (raw.clientTimestamp as string) || new Date().toISOString(),
            level,
            message,
            ...raw,
          };
          entries.push(entry);
        } catch {
          continue;
        }
      }

      const total = entries.length;
      entries.reverse();
      const paginatedEntries = entries.slice(offset, offset + limit);

      const availableDates: string[] = [];
      try {
        const dirEntries = await fs.readdir(logDir, { withFileTypes: true });
        for (const entry of dirEntries) {
          if (entry.isFile() && entry.name.endsWith('.log')) {
            const dateMatch = entry.name.match(/(\d{4}-\d{2}-\d{2})\.log$/);
            if (dateMatch) {
              availableDates.push(dateMatch[1]);
            }
          }
        }
      } catch {
        // eslint-disable-next-line no-empty
      }
      availableDates.sort().reverse();

      res.json({
        logs: paginatedEntries,
        availableDates,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        fileName,
        date,
        type: logType,
      });
    } catch (err) {
      console.error('Error reading logs:', err);
      res.status(500).json({ error: 'Failed to read log file' });
    }
  });

  router.get('/logs/files', async (req, res) => {
    try {
      const query = req.query as { type?: LogType; gameId?: string };
      const files: LogFileInfo[] = [];

      const logTypes: LogType[] = ['requests', 'errors', 'events', 'games'];
      const dirsToScan = logTypes.map(t => {
        let dir: string;
        if (t === 'games') {
          dir = chessConfig.log.gameLogDir;
        } else if (t === 'events') {
          dir = chessConfig.log.gameLogDir.replace('/games', '/events');
        } else {
          const dirMap: Record<string, string> = {
            requests: chessConfig.log.requestLogDir,
            errors: chessConfig.log.errorLogDir,
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

  router.post('/logs/export', async (req, res) => {
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
          baseDir = chessConfig.log.gameLogDir;
        } else if (type === 'events') {
          baseDir = chessConfig.log.gameLogDir.replace('/games', '/events');
        } else {
          const dirMap: Record<string, string> = {
            requests: chessConfig.log.requestLogDir,
            errors: chessConfig.log.errorLogDir,
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

const adminRouter: Router = createAdminRouter();
export default adminRouter;