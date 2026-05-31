/**
 * 端口工具 - 查找和检查可用端口
 */

import * as net from 'net';

const MIN_PORT = 30000;
const MAX_PORT = 50000;
const MAX_ATTEMPTS = MAX_PORT - MIN_PORT + 1;

/**
 * Finds a random available TCP port in the range 30000-50000.
 *
 * @returns A promise that resolves to an available port number
 */
export function findAvailablePort(): Promise<number> {
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
export function checkPortAvailable(port: number): Promise<boolean> {
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
