export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

export class GameLogger {
  private logs: LogEntry[] = [];
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    const levelName = LogLevel[level];
    console.log(`[${levelName}] ${message}`, data || '');
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getGameReplay(gameId: string): LogEntry[] {
    return this.logs.filter(
      log => log.data?.gameId === gameId || log.message.includes(gameId)
    );
  }

  clear(): void {
    this.logs = [];
  }

  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const gameLogger = new GameLogger();
