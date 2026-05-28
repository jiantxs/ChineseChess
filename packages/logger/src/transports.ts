/**
 * @fileoverview 日志传输模块 - 提供公共的 transport 创建逻辑
 * @module @chess/logger
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { ChessConfig } from '@chess/config';

/**
 * 获取日志根目录
 */
const getLogDir = (config: ChessConfig) => path.join(config.log.monorepoRoot, 'logs');

/**
 * 获取控制台格式化配置
 */
const getConsoleFormat = () =>
  winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
      return msg;
    })
  );

/**
 * 创建每日轮转文件传输器
 */
const createFileTransport = (
  config: ChessConfig,
  subDir: string,
  filenamePattern: string
): DailyRotateFile =>
  new DailyRotateFile({
    filename: path.join(getLogDir(config), subDir, filenamePattern),
    datePattern: 'YYYY-MM-DD',
    maxFiles: config.log.maxFiles,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  });

/**
 * 创建控制台传输器
 */
const createConsoleTransport = (level: string): winston.transport =>
  new winston.transports.Console({
    level,
    format: getConsoleFormat(),
  });

/**
 * 根据配置创建 Winston transports 数组
 */
const createTransports = (
  config: ChessConfig,
  subDir: string,
  filenamePattern: string,
  level: string
): winston.transport[] => {
  const transports: winston.transport[] = [
    createFileTransport(config, subDir, filenamePattern),
  ];

  if (process.env.NODE_ENV !== 'production') {
    transports.push(createConsoleTransport(level));
  }

  return transports;
};

import path from 'path';

export { createFileTransport, createConsoleTransport, createTransports, getLogDir };