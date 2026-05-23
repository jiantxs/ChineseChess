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
import * as net from 'net';
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

let mainWindow: BrowserWindow | null = null;
let stopServer: (() => void) | null = null;

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
      },
      frontend: {
        buildOutput: publicPath
      },
    });

    const result = startServer(config, { publicPath });
    stopServer = result.stop;
    console.log(`Backend server started at http://127.0.0.1:${port}${basePrefix}`);

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    main();
  }
});
