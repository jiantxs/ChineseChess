/**
 * @file 客户端日志记录器，将日志发送到后端进行持久化存储
 *
 * 为需要服务端记录的前端错误和事件提供结构化日志，
 * 用于监控和调试。
 *
 * 用法：
 *   import { clientLogger } from './clientLogger';
 *   clientLogger.error('消息解析失败', { error: err.message });
 *   clientLogger.warn('未处理的消息类型', { type: message.type });
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
 * 通过 fetch 向后端服务器发送日志条目
 */
async function sendToBackend(entry: ClientLogEntry): Promise<void> {
  try {
    await fetch(apiPath('/api/game/logs/client'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // 静默失败 - 我们不希望日志记录导致更多错误
  }
}

/**
 * 日志队列，用于在连接可用时发送
 */
const logQueue: ClientLogEntry[] = [];
let isOnline = true;

/**
 * 处理日志队列，将所有待发送的日志发送到后端
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
 * 记录调试消息
 */
function debug(message: string, metadata?: Record<string, unknown>): void {
  const entry: ClientLogEntry = {
    level: 'debug',
    message,
    timestamp: Date.now(),
    source: 'frontend',
    metadata,
  };

  // 在开发环境中也输出到控制台
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[CLIENT:DEBUG] ${message}`, metadata || '');
  }

  logQueue.push(entry);
  processQueue();
}

/**
 * 记录信息消息
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
 * 记录警告消息
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
 * 记录错误消息
 */
function error(message: string, metadata?: Record<string, unknown>): void {
  const entry: ClientLogEntry = {
    level: 'error',
    message,
    timestamp: Date.now(),
    source: 'frontend',
    metadata,
  };

  // 始终输出到控制台
  console.error(`[CLIENT:ERROR] ${message}`, metadata || '');

  logQueue.push(entry);
  processQueue();
}

/**
 * 设置在线状态 - 离线时，日志会被排队
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