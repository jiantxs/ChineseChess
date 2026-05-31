/**
 * 服务器管理 - 启动和管理后端服务器
 */

import { startServer } from '@chess/backend';
import { createChessConfig } from '@chess/config';
import type { ChessConfig } from '@chess/config';
import type { LoggerInstance } from '@chess/logger';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { findAvailablePort, checkPortAvailable } from '../utils/portUtils.js';

export interface ServerHandles {
  stopServer: (() => void) | null;
  stopMobileServer: (() => void) | null;
}

/**
 * 启动主服务器
 */
export function startMainServer(
  port: number,
  basePrefix: string,
  publicPath: string,
  logger: LoggerInstance
): { stop: () => void; config: ChessConfig } {
  const config = createChessConfig({
    server: {
      port,
      host: '127.0.0.1',
      prefix: basePrefix,
      sessionSecret: 'electron-session-secret',
      sessionMaxAgeMs: 24 * 60 * 60 * 1000,
      platform: 'win'
    }
  });

  const result = startServer(config, { publicPath });
  logger.logSystemEvent('Backend server started', { url: `http://127.0.0.1:${port}${basePrefix}` });

  return { stop: result.stop, config };
}

/**
 * 启动移动服务器
 */
export async function startMobileServer(
  config: ChessConfig,
  publicPath: string,
  preferenceManager: any,
  logger: LoggerInstance
): Promise<{ stop: (() => void) | null; mobileCode: string | null }> {
  const prefs = preferenceManager.getPreference();
  if (prefs.extraSettings?.extraServer?.enabled?.value !== true) {
    // Clear textCode and hidden properties if extra server is disabled
    preferenceManager.updatePreference({
      extraSettings: {
        label: '额外设置',
        extraServer: {
          label: '额外服务器',
          textCode: { value: '', visible: true, label: '服务器地址编码', valueType: 'string', readonly: true },
          _port: { value: 0, visible: false, label: '', valueType: 'number' },
          _prefix: { value: '', visible: false, label: '', valueType: 'string' }
        }
      }
    } as any);
    logger.logSystemEvent('Mobile server code cleared');
    return { stop: null, mobileCode: null };
  }

  // 判断是否启用"记住服务器地址编码"
  const rememberCode = prefs.extraSettings.extraServer.rememberServerCode?.value !== false;

  let mobilePort: number;
  let mobilePrefix: string;

  if (rememberCode) {
    const savedPort = prefs.extraSettings.extraServer._port?.value;
    const savedPrefix = prefs.extraSettings.extraServer._prefix?.value;

    if (savedPort && savedPrefix) {
      const isAvailable = await checkPortAvailable(savedPort);
      if (isAvailable) {
        mobilePort = savedPort;
        mobilePrefix = savedPrefix;
        logger.logSystemEvent('Using remembered server address', { port: mobilePort, prefix: mobilePrefix });
      } else {
        mobilePort = await findAvailablePort();
        mobilePrefix = `/${randomUUID()}`;
        preferenceManager.updatePreference({
          extraSettings: {
            label: '额外设置',
            extraServer: {
              label: '额外服务器',
              _port: { value: mobilePort, visible: false, label: '', valueType: 'number' },
              _prefix: { value: mobilePrefix, visible: false, label: '', valueType: 'string' }
            }
          }
        } as any);
        logger.logSystemEvent('Saved port unavailable, generated new', { port: mobilePort, prefix: mobilePrefix });
      }
    } else {
      mobilePort = await findAvailablePort();
      mobilePrefix = `/${randomUUID()}`;
      preferenceManager.updatePreference({
        extraSettings: {
          label: '额外设置',
          extraServer: {
            label: '额外服务器',
            _port: { value: mobilePort, visible: false, label: '', valueType: 'number' },
            _prefix: { value: mobilePrefix, visible: false, label: '', valueType: 'string' }
          }
        }
      } as any);
      logger.logSystemEvent('First launch, generated and saved', { port: mobilePort, prefix: mobilePrefix });
    }
  } else {
    mobilePort = await findAvailablePort();
    mobilePrefix = `/${randomUUID()}`;
    logger.logSystemEvent('Remember server code disabled, using random', { port: mobilePort, prefix: mobilePrefix });
  }

  const mobileMonorepoRoot = path.join(config.log.monorepoRoot, 'mobile');

  const mobileConfig = createChessConfig({
    server: {
      port: mobilePort,
      host: '0.0.0.0',
      prefix: mobilePrefix,
      sessionSecret: 'electron-mobile-session-secret',
      sessionMaxAgeMs: 24 * 60 * 60 * 1000,
      platform: 'android'
    },
    log: {
      ...config.log,
      monorepoRoot: mobileMonorepoRoot,
      requestLogDir: path.join(mobileMonorepoRoot, 'logs', 'requests'),
      errorLogDir: path.join(mobileMonorepoRoot, 'logs', 'errors'),
      gameLogDir: path.join(mobileMonorepoRoot, 'logs', 'games'),
    }
  });

  const mobileResult = startServer(mobileConfig, { publicPath });
  logger.logSystemEvent('Mobile server started', { url: `http://0.0.0.0:${mobilePort}${mobilePrefix}` });

  // Collect all non-internal IPv4 addresses
  const networkInterfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const iface of Object.values(networkInterfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address);
      }
    }
  }

  // Encode port, prefix and addresses as base64 JSON
  const mobileCode = Buffer.from(JSON.stringify({ port: mobilePort, prefix: mobilePrefix, addresses })).toString('base64');
  preferenceManager.updatePreference({
    extraSettings: {
      label: '额外设置',
      extraServer: {
        label: '额外服务器',
        textCode: { value: mobileCode, visible: true, label: '服务器地址编码', valueType: 'string', readonly: true }
      }
    }
  } as any);
  logger.logSystemEvent('Mobile server code saved to preference');

  return { stop: mobileResult.stop, mobileCode };
}
