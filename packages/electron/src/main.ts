/**
 * Electron main process for Chinese Chess desktop application.
 *
 * Features:
 * - Scans for an available high port (30000-50000, randomized)
 * - Starts backend server directly (same Node.js process)
 * - Opens a window pointing to the local server
 * - Manages process lifecycle (cleanup on exit)
 */

import { app, BrowserWindow } from 'electron';
import { startServer } from '@chess/backend';
import { createChessConfig } from '@chess/config';
import { createPreferenceManager } from '@chess/preference';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Finds a random available TCP port in the range 30000-50000.
 *
 * @returns A promise that resolves to an available port number
 */
function findAvailablePort(): Promise<number> {
  const MIN_PORT = 30000;
  const MAX_PORT = 50000;
  const MAX_ATTEMPTS = MAX_PORT - MIN_PORT + 1;

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryPort = (): void => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        reject(new Error(`No available ports in range ${MIN_PORT}-${MAX_PORT}`));
        return;
      }

      const port = Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
      const server = net.createServer();

      server.listen(port, '127.0.0.1', () => {
        const actualPort = (server.address() as net.AddressInfo).port;
        server.close(() => resolve(actualPort));
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          tryPort();
        } else {
          reject(err);
        }
      });
    };

    tryPort();
  });
}

/**
 * 检查指定端口是否可用
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '0.0.0.0', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

let mainWindow: BrowserWindow | null = null;
let stopServer: (() => void) | null = null;
let stopMobileServer: (() => void) | null = null;

/**
 * Creates the main application window.
 *
 * @param port - The port the backend is running on
 * @param prefix - The URL prefix (e.g., '/uuid')
 */
function createWindow(port: number, prefix: string = ''): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: '象棋',
    icon: path.resolve(__dirname, '../assets/icon.png'),
    resizable: false,
  });

  // Load the frontend from the backend server with prefix
  const url = `http://127.0.0.1:${port}${prefix}`;
  console.log(`Loading URL: ${url}`);
  mainWindow.loadURL(url);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Main application entry point.
 */
async function main(): Promise<void> {
  try {
    // Find an available port
    const port = await findAvailablePort();
    console.log(`Found available port: ${port}`);

    // Generate random UUID as base URL prefix
    const basePrefix = `/${randomUUID()}`;
    console.log(`Generated base prefix: ${basePrefix}`);

    // Determine the correct public path for static assets
    // In packaged app, public files are in dist/public relative to main.js
    // In development, they are in packages/backend/public
    const isPackaged = app.isPackaged;
    const publicPath = isPackaged
      ? path.resolve(app.getAppPath(), 'dist', 'public')
      : path.resolve(__dirname, '../../backend/public');
    console.log(`Public path: ${publicPath} (isPackaged: ${isPackaged})`);

    // Start backend server directly in the same process
    console.log('Starting backend server...');

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
    stopServer = result.stop;
    console.log(`Backend server started at http://127.0.0.1:${port}${basePrefix}`);

    // Create preference manager instance bound to main config
    const mainPreferenceManager = createPreferenceManager(config);

    // Handle extra mobile server
    const prefs = mainPreferenceManager.getPreference();
    if (prefs.extraSettings?.extraServer?.enabled?.value === true) {
      // 判断是否启用"记住服务器地址编码"
      const rememberCode = prefs.extraSettings.extraServer.rememberServerCode?.value !== false;

      let mobilePort: number;
      let mobilePrefix: string;

      if (rememberCode) {
        // 优先从隐藏属性读取之前保存的 port 和 prefix
        const savedPort = prefs.extraSettings.extraServer._port?.value;
        const savedPrefix = prefs.extraSettings.extraServer._prefix?.value;

        if (savedPort && savedPrefix) {
          // 验证保存的端口是否仍可用
          const isAvailable = await checkPortAvailable(savedPort);
          if (isAvailable) {
            mobilePort = savedPort;
            mobilePrefix = savedPrefix;
            console.log(`Using remembered server address: port=${mobilePort}, prefix=${mobilePrefix}`);
          } else {
            // 端口被占用，重新生成
            mobilePort = await findAvailablePort();
            mobilePrefix = `/${randomUUID()}`;
            mainPreferenceManager.updatePreference({
              extraSettings: {
                extraServer: {
                  _port: { value: mobilePort },
                  _prefix: { value: mobilePrefix }
                }
              }
            });
            console.log(`Saved port unavailable, generated new: port=${mobilePort}, prefix=${mobilePrefix}`);
          }
        } else {
          // 首次启动，生成新的并保存
          mobilePort = await findAvailablePort();
          mobilePrefix = `/${randomUUID()}`;
          mainPreferenceManager.updatePreference({
            extraSettings: {
              extraServer: {
                _port: { value: mobilePort },
                _prefix: { value: mobilePrefix }
              }
            }
          });
          console.log(`First launch, generated and saved: port=${mobilePort}, prefix=${mobilePrefix}`);
        }
      } else {
        // 不记住地址编码，每次随机生成
        mobilePort = await findAvailablePort();
        mobilePrefix = `/${randomUUID()}`;
        console.log(`Remember server code disabled, using random: port=${mobilePort}, prefix=${mobilePrefix}`);
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
      stopMobileServer = mobileResult.stop;
      console.log(`Mobile server started at http://0.0.0.0:${mobilePort}${mobilePrefix}`);

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
      mainPreferenceManager.updatePreference({
        extraSettings: {
          extraServer: {
            textCode: { value: mobileCode }
          }
        }
      });
      console.log('Mobile server code saved to preference');
    } else {
      // Clear textCode and hidden properties if extra server is disabled
      mainPreferenceManager.updatePreference({
        extraSettings: {
          extraServer: {
            textCode: { value: '' },
            _port: { value: 0 },
            _prefix: { value: '' }
          }
        }
      });
      console.log('Mobile server code cleared');
    }

    // Create the window with prefix URL
    createWindow(port, basePrefix);
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
}

// Electron lifecycle
app.on('ready', main);

app.on('window-all-closed', () => {
  // Stop the backend server when the window is closed
  if (stopServer) {
    stopServer();
  }
  if (stopMobileServer) {
    stopMobileServer();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    main();
  }
});
