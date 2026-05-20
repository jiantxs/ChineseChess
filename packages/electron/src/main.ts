/**
 * Electron main process for Chinese Chess desktop application.
 *
 * Features:
 * - Scans for an available high port (30000+)
 * - Starts backend server directly (same Node.js process)
 * - Opens a window pointing to the local server
 * - Manages process lifecycle (cleanup on exit)
 */

import { app, BrowserWindow } from 'electron';
import { startServer } from '@chess/backend';
import * as net from 'net';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Finds an available TCP port in the given range.
 * Tries ports sequentially starting from startPort.
 *
 * @param startPort - The first port to try
 * @returns A promise that resolves to an available port number
 */
function findAvailablePort(startPort: number = 30000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(startPort, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
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

    // Start backend server directly in the same process
    console.log('Starting backend server...');
    const result = startServer({ port, host: '127.0.0.1', prefix: basePrefix });
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
