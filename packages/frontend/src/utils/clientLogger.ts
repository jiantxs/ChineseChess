/**
 * @file Client-side logger that sends logs to backend for persistent storage
 *
 * Provides structured logging for frontend errors and events that need to be
 * logged server-side for monitoring and debugging.
 *
 * Usage:
 *   import { clientLogger } from './clientLogger';
 *   clientLogger.error('Failed to parse message', { error: err.message });
 *   clientLogger.warn('Unhandled message type', { type: message.type });
 *
 * @module clientLogger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, unknown>;
}

import { apiPath } from './api';

/**
 * Sends a log entry to the backend server via fetch
 */
async function sendToBackend(entry: ClientLogEntry): Promise<void> {
  try {
    await fetch(apiPath('/api/game/logs/client'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Silently fail - we don't want logging to cause more errors
  }
}

/**
 * Queue of logs to send when connection is available
 */
const logQueue: ClientLogEntry[] = [];
let isOnline = true;

/**
 * Process the log queue, sending all pending logs to backend
 */
async function processQueue(): Promise<void> {
  if (!isOnline || logQueue.length === 0) return;

  const entries = [...logQueue];
  logQueue.length = 0;

  for (const entry of entries) {
    await sendToBackend(entry);
  }
}

/**
 * Log a debug message
 */
function debug(message: string, metadata?: Record<string, unknown>): void {
  const entry: ClientLogEntry = {
    level: 'debug',
    message,
    timestamp: Date.now(),
    source: 'frontend',
    metadata,
  };

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[CLIENT:DEBUG] ${message}`, metadata || '');
  }

  logQueue.push(entry);
  processQueue();
}

/**
 * Log an informational message
 */
function info(message: string, metadata?: Record<string, unknown>): void {
  const entry: ClientLogEntry = {
    level: 'info',
    message,
    timestamp: Date.now(),
    source: 'frontend',
    metadata,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[CLIENT:INFO] ${message}`, metadata || '');
  }

  logQueue.push(entry);
  processQueue();
}

/**
 * Log a warning message
 */
function warn(message: string, metadata?: Record<string, unknown>): void {
  const entry: ClientLogEntry = {
    level: 'warn',
    message,
    timestamp: Date.now(),
    source: 'frontend',
    metadata,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[CLIENT:WARN] ${message}`, metadata || '');
  }

  logQueue.push(entry);
  processQueue();
}

/**
 * Log an error message
 */
function error(message: string, metadata?: Record<string, unknown>): void {
  const entry: ClientLogEntry = {
    level: 'error',
    message,
    timestamp: Date.now(),
    source: 'frontend',
    metadata,
  };

  // Always log to console
  console.error(`[CLIENT:ERROR] ${message}`, metadata || '');

  logQueue.push(entry);
  processQueue();
}

/**
 * Set online status - when offline, logs are queued
 */
function setOnline(online: boolean): void {
  isOnline = online;
  if (online) {
    processQueue();
  }
}

export const clientLogger = {
  debug,
  info,
  warn,
  error,
  setOnline,
};

export default clientLogger;