import type { Request, Response } from 'express';
import type { ChessConfig } from '@chess/config';

import fs from 'fs/promises';
import path from 'path';

/**
 * Valid log types for the admin dashboard
 */
export type LogType = 'requests' | 'errors' | 'events' | 'games';

/**
 * Query parameters for log retrieval endpoints
 */
export interface LogQuery {
  type?: LogType;
  date?: string;
  gameId?: string;
  limit?: string;
  offset?: string;
}

/**
 * Information about a log file returned to the client
 */
export interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  type: LogType;
  gameId?: string;
}

/**
 * A parsed log entry from a log file
 */
export interface ParsedLogEntry {
  timestamp?: string;
  level?: string;
  message?: string;
  // Allow any additional fields from the raw log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Validates a date string in YYYY-MM-DD format
 */
export function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Sanitizes and validates a log type string
 * @returns The valid LogType or null if invalid
 */
export function sanitizeLogType(type: string): LogType | null {
  const validTypes: LogType[] = ['requests', 'errors', 'events', 'games'];
  if (validTypes.includes(type as LogType)) {
    return type as LogType;
  }
  return null;
}

/**
 * Sanitizes a user-provided path to prevent directory traversal
 * @param basePath - The base directory to join with
 * @param userPath - The user-provided path component
 * @returns The sanitized absolute path
 */
export function sanitizePath(basePath: string, userPath: string): string {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(basePath, normalized);
}

/**
 * Maps log type to its corresponding directory
 */
export function getLogDir(config: ChessConfig, logType: LogType, gameId?: string): string {
  if (logType === 'games') {
    if (!gameId) {
      throw new Error('gameId is required for games log type');
    }
    const sanitizedGameId = gameId.replace(/[^a-zA-Z0-9-_]/g, '');
    return path.join(config.log.gameLogDir, sanitizedGameId);
  }

  const dirMap: Record<string, string> = {
    requests: config.log.requestLogDir,
    errors: config.log.errorLogDir,
    events: path.join(path.dirname(config.log.gameLogDir), 'events'),
  };
  return dirMap[logType];
}

/**
 * Maps log type to its file prefix
 */
export function getLogFilePrefix(logType: LogType): string {
  const fileNameMap: Record<string, string> = {
    requests: 'request',
    errors: 'error',
    events: 'events',
    games: '',
  };
  return fileNameMap[logType];
}

/**
 * Parses a single line from a log file into a ParsedLogEntry
 */
export function parseLogLine(line: string): ParsedLogEntry | null {
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
    return entry;
  } catch {
    return null;
  }
}