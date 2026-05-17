/**
 * @file 用于构建带前缀支持的正确路径的 API 工具函数
 *
 * 处理开发和生产部署的路径前缀。
 * 当部署在路径前缀下时（如 /abcc），所有 API 调用都需要包含前缀。
 *
 * 用法：
 *   import { apiPath } from './api';
 *   await fetch(apiPath('/api/game/player-id'), { method: 'POST' });
 *
 * @module utils/api
 */

/**
 * 返回带前缀支持的 API 路径。
 * 如果应用部署在前缀下（如 /abcc），则添加前缀。
 * 如果部署在根目录，则返回原路径。
 *
 * @param path - API 路径（例如 '/api/game/player-id'）
 * @returns 包含前缀的完整路径（如果适用）
 *
 * @example
 * // 部署在根目录
 * apiPath('/api/game/player-id')  // '/api/game/player-id'
 *
 * // 部署在 /abcc
 * apiPath('/api/game/player-id')  // '/abcc/api/game/player-id'
 */
export function apiPath(path: string): string {
  const pathname = window.location.pathname;
  const pathPrefix = pathname === '/' ? '' : pathname.replace(/\/[^\/]*$/, '');
  return pathPrefix ? `${pathPrefix}${path}` : path;
}

/**
 * 返回带前缀支持的 WebSocket URL。
 *
 * @param path - WebSocket 路径（例如 '/ws'）
 * @returns 带前缀的完整 WebSocket URL（如果适用）
 *
 * @example
 * // 部署在根目录
 * wsPath('/ws')  // 'ws://localhost:3000/ws'
 *
 * // 部署在 /abcc
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