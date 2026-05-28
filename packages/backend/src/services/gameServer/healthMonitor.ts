/**
 * @fileoverview 处理实时多人游戏的 WebSocket 游戏服务器
 * @module backend/src/services/gameServer/healthMonitor
 *
 * 管理中国象棋多人游戏的 WebSocket 连接。
 * 处理玩家认证、游戏创建/加入、走动验证，
 * 以及实时游戏状态同步。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { WebSocket } from 'ws';
import type { ConnectedPlayer } from './types';
import type { GameManager } from '@chess/core';
import type { ChessConfig } from '@chess/config';
import type { LoggerInstance } from '@chess/logger';
import { handleDisconnect } from './connectionManager';

/**
 * 启动连接健康检查的 ping 间隔
 * @description 启动 30 秒间隔：
 *              - 为所有玩家设置 isAlive = false
 *              - 向每个玩家发送 ping
 *              - 如果未收到 pong（isAlive 保持 false）则终止连接
 *
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param config - ChessConfig 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 使用 WebSocket ping() 方法
 * - Pong 处理器设置 isAlive = true
 * - 没有 pong 响应的连接被终止
 */
export function startPingInterval(
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  config: ChessConfig,
  logger: LoggerInstance
): NodeJS.Timeout {
  return setInterval(() => {
    for (const player of players.values()) {
      if (!player.isAlive) {
        player.ws.terminate();
        handleDisconnect(player, players, gameManager, config, logger);
        continue;
      }
      player.isAlive = false;
      player.ws.ping();
    }
  }, 30000);
}

/**
 * 启动不活跃游戏清理的清理间隔
 * @description 启动 10 分钟间隔：
 *              - 调用 GameManager.cleanupInactiveGames(3600000)
 *              - 如果有游戏被清理则记录清理数量
 *
 * @param gameManager - GameManager 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 清理 1 小时（3600000 毫秒）不活跃的游戏
 * - 仅在实际清理游戏时记录
 */
export function startCleanupInterval(
  gameManager: GameManager,
  logger: LoggerInstance
): NodeJS.Timeout {
  return setInterval(() => {
    const cleaned = gameManager.cleanupInactiveGames(3600000);
    if (cleaned > 0) {
      logger.logWebSocketEvent('cleanup', 'system', undefined, { cleaned });
    }
  }, 600000);
}