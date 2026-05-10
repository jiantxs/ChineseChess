/**
 * Electron main process for Chinese Chess desktop application.
 *
 * Features:
 * - Scans for an available high port (30000+)
 * - Requires backend server directly (same Node.js process)
 * - Opens a window pointing to the local server
 * - Manages process lifecycle (cleanup on exit)
 */

import { app, BrowserWindow } from 'electron';
import { spawn } from 'child_process';
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

/**
 * Gets the path to the backend entry point.
 * In development: uses the monorepo backend dist
 * In production: uses the packaged backend-dist
 */
function getBackendPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(__dirname, '../../backend/dist/index.js');
  }
  return path.resolve(process.resourcesPath, 'backend-dist/dist/index.js');
}

function getNodePath(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'node';
  }
  return path.resolve(process.resourcesPath, 'node-dist/node.exe');
}

let mainWindow: BrowserWindow | null = null;
let backendProcess: ReturnType<typeof spawn> | null = null;

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
 * Waits for the backend to be ready by polling the health endpoint.
 *
 * @param port - The port the backend is running on
 * @param prefix - The URL prefix (e.g., '/uuid')
 * @param timeout - Maximum time to wait in milliseconds
 * @returns A promise that resolves when the backend is ready
 */
function waitForBackend(port: number, prefix: string = '', timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const healthPath = prefix ? `${prefix}/api/config` : '/api/config';
    const interval = setInterval(() => {
      const socket = net.createConnection(port, '127.0.0.1');

      socket.on('connect', () => {
        socket.write(`GET ${healthPath} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n`);
      });

      socket.on('data', () => {
        clearInterval(interval);
        socket.destroy();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error('Backend failed to start within timeout'));
        }
      });
    }, 500);
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

    // Start backend as child process using bundled Node.js
    const backendPath = getBackendPath();
    const nodePath = getNodePath();
    
    console.log(`Starting backend with: ${nodePath} ${backendPath}`);
    
    const env = {
      ...process.env,
      CCHESSPORT: port.toString(),
      CCHESSHOST: '127.0.0.1',
      CCHESSPREFIX: basePrefix,
      NODE_ENV: 'production',
    };

    const proc = spawn(nodePath, [backendPath], {
      env,
      cwd: path.dirname(backendPath),
      stdio: 'pipe',
    });

    proc.stdout?.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    proc.stderr?.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    proc.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      // Backend died — close the app so we don't leave a zombie Electron window
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      app.quit();
    });

    backendProcess = proc;

    // Wait for backend to be ready
    await waitForBackend(port, basePrefix);
    console.log('Backend is ready');

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
  // Kill the backend child process when the window is closed
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
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
