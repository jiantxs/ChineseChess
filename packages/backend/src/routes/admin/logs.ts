import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { ChessConfig } from '@chess/config';

import {
  LogQuery,
  LogType,
  ParsedLogEntry,
  isValidDate,
  sanitizeLogType,
  sanitizePath,
  getLogDir,
  getLogFilePrefix,
  parseLogLine,
} from './utils';

/**
 * Creates a router for log retrieval endpoints
 * @param config - The chess configuration
 * @returns Express router with /logs endpoint
 */
export function createLogsRouter(config: ChessConfig): Router {
  const router = Router();

  /**
   * GET /logs
   * Retrieves log entries with pagination and filtering
   */
  router.get('/', async (req, res) => {
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
      try {
        logDir = getLogDir(config, logType, query.gameId);
      } catch {
        res.status(400).json({ error: 'gameId is required for games log type' });
        return;
      }

      const filePrefix = getLogFilePrefix(logType);
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
        const entry = parseLogLine(line);
        if (entry) {
          entries.push(entry);
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

  return router;
}