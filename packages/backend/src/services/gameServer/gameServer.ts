/**
 * @fileoverview 处理实时多人游戏的 WebSocket 游戏服务器
 * @module backend/src/services/gameServer/gameServer
 *
 * 管理中国象棋多人游戏的 WebSocket 连接。
 * 处理玩家认证、游戏创建/加入、走动验证，
 * 以及实时游戏状态同步。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { WebSocketServer } from 'ws';
import {
  GameManager,
  gameLogger,
} from '@chess/core';
import type { ChessConfig } from '@chess/config';
import type { LoggerInstance } from '@chess/logger';
import type { ConnectedPlayer } from './types';
import { setupWebSocketServer } from './messageHandlers';
import { startPingInterval, startCleanupInterval } from './healthMonitor';

/**
 * 用于实时多人中国象棋游戏的 WebSocket 游戏服务器
 * @class GameServer
 * @description 管理 WebSocket 连接、游戏状态同步、
 *              通过 playerId 查询参数进行玩家认证，以及自动
 *              清理不活跃的游戏和连接。
 *
 * @remarks
 * - 在 '/ws' 路径上监听 WebSocket 连接
 * - 需要 'playerId' 查询参数进行连接认证
 * - 实现 30 秒 ping/pong 健康检查
 * - 实现 10 分钟清理间隔，清理不活跃游戏
 * - 30 秒重连窗口，然后玩家被判负
 *
 * @example
 * const server = createServer(app);
 * const gameServer = new GameServer(server, gameManager);
 * // 服务器通过 gameServer.stop() 在 SIGTERM 时停止
 */
export class GameServer {
  /** WebSocket 服务器实例 */
  private wss: WebSocketServer;
  /** 从 playerId 到 ConnectedPlayer 的映射，用于所有活动连接 */
  private players: Map<string, ConnectedPlayer> = new Map();
  /** GameManager 单例的引用，用于游戏操作 */
  private gameManager: GameManager;
  /** ChessConfig 实例 */
  private config: ChessConfig;
  /** 日志实例 */
  private logger: LoggerInstance;
  /** ping/pong 健康检查的间隔句柄（30 秒） */
  private pingInterval: NodeJS.Timeout | null = null;
  /** 不活跃游戏清理的间隔句柄（10 分钟） */
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * 创建新的 GameServer 实例
   * @constructor
   * @param server - 附加 WebSocket 服务器的 HTTP 服务器
   * @param gameManager - 用于游戏操作的 GameManager 实例
   * @param prefix - URL 前缀
   * @param config - ChessConfig 实例
   * @param logger - 日志实例
   *
   * @remarks
   * - 在 '/ws' 路径上创建 WebSocketServer
   * - 自动启动 ping 间隔和清理间隔
   * - 为新的 WebSocket 客户端设置连接处理器
   */
  constructor(server: import('http').Server | import('https').Server, gameManager: GameManager, prefix: string = '', config: ChessConfig, logger: LoggerInstance) {
    this.gameManager = gameManager;
    this.config = config;
    this.logger = logger;
    const wsPath = prefix ? `${prefix}/ws` : '/ws';
    this.wss = new WebSocketServer({ server, path: wsPath });

    // 将 @chess/core 的内存 gameLogger 桥接到基于文件的游戏日志记录
    gameLogger.setExternalLogger((gameId, action, metadata) => {
      this.logger.logGameLifecycle(gameId, action, metadata);
    });

    setupWebSocketServer(
      this.wss,
      this.players,
      this.gameManager,
      this.config,
      this.logger,
      () => {} // connection callback - currently unused
    );

    this.pingInterval = startPingInterval(
      this.players,
      this.gameManager,
      this.config,
      this.logger
    );

    this.cleanupInterval = startCleanupInterval(
      this.gameManager,
      this.logger
    );
  }

  /**
   * 优雅地停止游戏服务器
   * @description 停止所有间隔并关闭 WebSocket 服务器。
   *              在 SIGTERM 关闭期间调用。
   *
   * @remarks
   * - 如果正在运行则清除 ping 间隔
   * - 如果正在运行则清除清理间隔
   * - 关闭 WebSocket 服务器（不接受新连接）
   * - 现有连接将被终止
   */
  stop(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.wss.close();
  }
}