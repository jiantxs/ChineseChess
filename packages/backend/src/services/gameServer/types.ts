/**
 * @fileoverview 处理实时多人游戏的 WebSocket 游戏服务器
 * @module backend/src/services/gameServer/types
 *
 * 管理中国象棋多人游戏的 WebSocket 连接。
 * 处理玩家认证、游戏创建/加入、走动验证，
 * 以及实时游戏状态同步。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { WebSocket } from 'ws';
import { Side } from '@chess/types';

/**
 * 表示已连接的 WebSocket 玩家
 * @interface ConnectedPlayer
 * @description 跟踪每个已连接玩家客户端的 WebSocket 连接状态和当前游戏关联
 */
export interface ConnectedPlayer {
  /** 活动的 WebSocket 连接 */
  ws: WebSocket;
  /** 唯一玩家标识符（来自客户端的 UUID） */
  playerId: string;
  /** 玩家所在游戏的当前游戏 ID（如果在游戏中） */
  gameId?: string;
  /** 玩家所在的一方（如果在游戏中为 RED 或 BLACK） */
  side?: Side;
  /** 上次 ping 响应的时间戳 */
  lastPing: number;
  /** 连接健康标志（ping 设置为 false，pong 设置为 true） */
  isAlive: boolean;
  /** 断开连接后重连窗口的超时句柄 */
  reconnectTimeout?: NodeJS.Timeout;
}