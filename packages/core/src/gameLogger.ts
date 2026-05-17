/**
 * 中国象棋内存游戏事件日志记录器
 *
 * 用法：记录游戏事件以供回放和调试
 * 支持日志级别：DEBUG、INFO、WARN、ERROR
 * 导出单例 `gameLogger` 实例
 *
 * @module GameLogger
 * @fileoverview In-memory game event logger for Chinese Chess
 */

/**
 * 日志级别枚举
 * @enum {number}
 */
export enum LogLevel {
  /** 详细的调试信息 */
  DEBUG = 0,
  /** 一般信息消息 */
  INFO = 1,
  /** 潜在问题的警告消息 */
  WARN = 2,
  /** 失败错误消息 */
  ERROR = 3,
}

/**
 * 代表单个日志条目
 */
export interface LogEntry {
  /** Unix 时间戳（毫秒） */
  timestamp: number;
  /** 此条目的日志级别 */
  level: LogLevel;
  /** 日志消息文本 */
  message: string;
  /** 可选的附加结构化数据 */
  data?: Record<string, unknown>;
}

/**
 * 外部日志记录器接口，用于桥接到 Winston/文件日志。
 * 设置后，游戏事件也将转发到此外部日志记录器。
 */
export interface ExternalGameLogger {
  (gameId: string, action: string, metadata: Record<string, unknown>): void;
}

/**
 * 带级别过滤的内存事件日志记录器
 *
 * 在内存中存储日志条目，并支持按游戏 ID 过滤
 * 以进行游戏回放功能。
 *
 * 可选择通过 setExternalLogger() 将日志转发到外部日志记录器（例如基于 Winston 的）
 * 以进行文件持久化。
 */
export class GameLogger {
  private logs: LogEntry[] = [];
  private minLevel: LogLevel;
  private externalLogger: ExternalGameLogger | null = null;

  /**
   * 创建新的 GameLogger 实例
   * @param minLevel - 要记录的最小日志级别（默认：INFO）
   */
  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  /**
   * 设置外部日志记录器以接收游戏事件以进行文件持久化。
   * 这允许 @chess/core 将事件转发到 @chess/logger 而不
   * 创建循环依赖。
   *
   * @param logger - 外部日志记录器函数（gameId、action、metadata）
   */
  setExternalLogger(logger: ExternalGameLogger | null): void {
    this.externalLogger = logger;
  }

  /**
   * 内部日志方法
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 可选的附加数据
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // 转发到外部日志记录器（如果设置）以通过 Winston 进行文件持久化
    if (this.externalLogger && data?.gameId) {
      this.externalLogger(data.gameId as string, message, data);
    }
  }

  /**
   * 记录调试消息
   * @param message - 调试消息
   * @param data - 可选的附加数据
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录信息消息
   * @param message - 信息消息
   * @param data - 可选的附加数据
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告消息
   * @param message - 警告消息
   * @param data - 可选的附加数据
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误消息
   * @param message - 错误消息
   * @param data - 可选的附加数据
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 返回所有日志条目
   * @returns 所有日志条目的数组
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按游戏 ID 过滤日志以进行回放
   * @param gameId - 要过滤的游戏 ID
   * @returns 与指定游戏相关的日志条目数组
   */
  getGameReplay(gameId: string): LogEntry[] {
    return this.logs.filter(
      log => log.data?.gameId === gameId || log.message.includes(gameId)
    );
  }

  /**
   * 清除所有日志条目
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * 将所有日志导出为格式化的 JSON 字符串
   * @returns 所有日志条目的 JSON 字符串
   */
  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * 用于全局使用的 GameLogger 单例实例
 */
export const gameLogger = new GameLogger();
