/**
 * @fileoverview 处理实时多人游戏的 WebSocket 游戏服务器
 * @module backend/src/services/gameServer/connectionManager
 *
 * 管理中国象棋多人游戏的 WebSocket 连接。
 * 处理玩家认证、游戏创建/加入、走动验证，
 * 以及实时游戏状态同步。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { WebSocket } from 'ws';
import { GameMessage, MessageType } from '@chess/types';
import type { ConnectedPlayer } from './types';
import type { LoggerInstance } from '@chess/logger';
import type { ChessConfig } from '@chess/config';
import { GameManager } from '@chess/core';

/**
 * 向特定玩家发送消息
 * @param player - 要发送消息的 ConnectedPlayer
 * @param message - 要发送的 GameMessage
 *
 * @remarks
 * - 发送前检查 readyState 以避免错误
 * - 将消息对象 JSON 字符串化
 */
export function sendToPlayer(player: ConnectedPlayer, message: GameMessage): void {
  if (player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(message));
  }
}

/**
 * 向游戏中的所有玩家广播消息
 * @param players - 所有玩家的 Map
 * @param gameId - 要广播到的游戏 ID
 * @param message - 要发送给每个玩家的 GameMessage
 *
 * @see {@link sendToPlayer}
 */
export function broadcastToGame(
  players: Map<string, ConnectedPlayer>,
  gameId: string,
  message: GameMessage
): void {
  for (const player of players.values()) {
    if (player.gameId === gameId) {
      sendToPlayer(player, message);
    }
  }
}

/**
 * 向玩家发送错误消息
 * @param player - 要发送错误的 ConnectedPlayer
 * @param error - 错误消息字符串
 *
 * @see {@link sendToPlayer}
 */
export function sendError(player: ConnectedPlayer, error: string): void {
  sendToPlayer(player, {
    type: MessageType.ERROR,
    payload: { error },
    timestamp: Date.now(),
    gameId: player.gameId || '',
  });
}

/**
 * 处理 WebSocket 断开连接 - 管理清理和重连窗口
 * @description 处理玩家断开连接：
 *              - 清除任何待处理的重连超时
 *              - 向游戏广播 PLAYER_DISCONNECTED
 *              - 在判负之前设置 30 秒重连窗口
 *              - 超时后从 players 映射中移除玩家
 *
 * @param player - 断开连接的 ConnectedPlayer
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param config - ChessConfig 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 如果玩家在超时内重新连接，他们保留游戏槽位
 * - 如果超时到期，玩家被判负，游戏可能结束
 * - 使用 this.config.game.reconnectTimeoutMs 作为超时持续时间
 */
export function handleDisconnect(
  player: ConnectedPlayer,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  config: ChessConfig,
  logger: LoggerInstance
): void {
  if (player.reconnectTimeout) {
    clearTimeout(player.reconnectTimeout);
    player.reconnectTimeout = undefined;
  }

  if (player.gameId) {
    broadcastToGame(players, player.gameId, {
      type: MessageType.PLAYER_DISCONNECTED,
      payload: {
        playerId: player.playerId,
        message: 'Player disconnected',
      },
      timestamp: Date.now(),
      gameId: player.gameId,
    });

    player.reconnectTimeout = setTimeout(() => {
      const reconnected = players.get(player.playerId);
      if (!reconnected || !reconnected.gameId) {
        const game = gameManager.leaveGame(player.gameId!, player.playerId);
        if (game) {
          logger.logWebSocketEvent('game_over_disconnect', player.playerId, player.gameId!, {
            winner: game.winner,
            reason: 'player_disconnect',
          });
          broadcastToGame(players, player.gameId!, {
            type: MessageType.GAME_OVER,
            payload: {
              winner: game.winner,
              reason: 'player_disconnect',
            },
            timestamp: Date.now(),
            gameId: player.gameId!,
          });
        }
      }
      player.reconnectTimeout = undefined;
    }, config.game.reconnectTimeoutMs);
  }

  players.delete(player.playerId);
}