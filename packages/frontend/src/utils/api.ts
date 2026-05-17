/**
 * @file API utility functions for building correct paths with prefix support
 *
 * Handles path prefix for both development and production deployments.
 * When deployed under a path prefix (e.g., /abcc), all API calls need to include it.
 *
 * Usage:
 *   import { apiPath } from './api';
 *   await fetch(apiPath('/api/game/player-id'), { method: 'POST' });
 *
 * @module utils/api
 */

/**
 * Returns the API path with prefix support.
 * If the app is deployed under a prefix (e.g., /abcc), the prefix is prepended.
 * If deployed at root, returns the path as-is.
 *
 * @param path - The API path (e.g., '/api/game/player-id')
 * @returns The full path including prefix if applicable
 *
 * @example
 * // Deployed at root
 * apiPath('/api/game/player-id')  // '/api/game/player-id'
 *
 * // Deployed at /abcc
 * apiPath('/api/game/player-id')  // '/abcc/api/game/player-id'
 */
export function apiPath(path: string): string {
  const pathname = window.location.pathname;
  const pathPrefix = pathname === '/' ? '' : pathname.replace(/\/[^\/]*$/, '');
  return pathPrefix ? `${pathPrefix}${path}` : path;
}

/**
 * Returns the WebSocket URL with prefix support.
 *
 * @param path - The WebSocket path (e.g., '/ws')
 * @returns The full WebSocket URL with prefix if applicable
 *
 * @example
 * // Deployed at root
 * wsPath('/ws')  // 'ws://localhost:3000/ws'
 *
 * // Deployed at /abcc
 * wsPath('/ws')  // 'ws://localhost:3000/abcc/ws'
 */
export function wsPath(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.host;
  const pathname = window.location.pathname;
  const pathPrefix = pathname === '/' ? '' : pathname.replace(/\/[^\/]*$/, '');
  const fullPath = pathPrefix ? `${pathPrefix}${path}` : path;
  return `${protocol}//${hostname}${fullPath}`;
}

export default { apiPath, wsPath };