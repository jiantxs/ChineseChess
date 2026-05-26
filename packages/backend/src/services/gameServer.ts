/**
 * @fileoverview 处理实时多人游戏的 WebSocket 游戏服务器
 * @module backend/src/services/gameServer
 *
 * 管理中国象棋多人游戏的 WebSocket 连接。
 * 处理玩家认证、游戏创建/加入、走动验证，
 * 以及实时游戏状态同步。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import {
  GameMessage,
  MessageType,
  Position,
  Side,
  GameStatus,
} from '@chess/types';
import {
  GameManager,
  PieceLayout,
  gameLogger,
} from '@chess/core';
import type { ChessConfig } from '@chess/config';
import type { LoggerService } from './logger';
import { getLayout, standardLayoutData } from '@chess/game-records';

/**
 * 表示已连接的 WebSocket 玩家
 * @interface ConnectedPlayer
 * @description 跟踪每个已连接玩家客户端的 WebSocket 连接状态和当前游戏关联
 */
interface ConnectedPlayer {
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
  /** 日志服务实例 */
  private loggerService: LoggerService;
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
   * @param loggerService - 日志服务实例
   *
   * @remarks
   * - 在 '/ws' 路径上创建 WebSocketServer
   * - 自动启动 ping 间隔和清理间隔
   * - 为新的 WebSocket 客户端设置连接处理器
   */
  constructor(server: import('http').Server | import('https').Server, gameManager: GameManager, prefix: string = '', config: ChessConfig, loggerService: LoggerService) {
    this.gameManager = gameManager;
    this.config = config;
    this.loggerService = loggerService;
    const wsPath = prefix ? `${prefix}/ws` : '/ws';
    this.wss = new WebSocketServer({ server, path: wsPath });

    // 将 @chess/core 的内存 gameLogger 桥接到基于文件的游戏日志记录
    gameLogger.setExternalLogger((gameId, action, metadata) => {
      this.loggerService.logGameLifecycle(gameId, action, metadata);
    });

    this.setupWebSocketServer();
    this.startPingInterval();
    this.startCleanupInterval();
  }

  /**
   * 设置 WebSocket 服务器连接处理器
   * @private
   * @description 为以下事件注册处理器：
   *              - Connection（验证 playerId，注册玩家）
   *              - Message（解析 JSON，路由到处理器）
   *              - Close（处理断开连接，附带重连窗口）
   *              - Pong（更新 isAlive 标志）
   *
   * @remarks
   * - 如果没有 playerId 查询参数，以代码 1008 拒绝连接
   * - 成功连接后发送初始 PONG 消息
   * - 将消息解析为 JSON GameMessage 对象
   * - 通过 logWebSocketEvent 记录所有事件
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const { query } = parseUrl(req.url || '', true);
      const playerId = query.playerId as string;

      if (!playerId) {
        ws.close(1008, 'Missing playerId');
        return;
      }

      const player: ConnectedPlayer = {
        ws,
        playerId,
        lastPing: Date.now(),
        isAlive: true,
      };

      this.players.set(playerId, player);

      this.loggerService.logWebSocketEvent('connection', playerId);

      ws.on('message', (data: RawData) => {
        try {
          const message: GameMessage = JSON.parse(data.toString());
          this.loggerService.logWebSocketEvent('message', playerId, message.gameId, {
            messageType: message.type,
          });
          this.handleMessage(player, message);
        } catch (error) {
          this.loggerService.logError('websocket_message_parse_error', error as Error, { playerId });
          this.sendError(player, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.loggerService.logWebSocketEvent('disconnect', playerId, player.gameId);
        this.handleDisconnect(player);
      });

      ws.on('pong', () => {
        player.isAlive = true;
        player.lastPing = Date.now();
      });

      this.sendToPlayer(player, {
        type: MessageType.PONG,
        payload: { connected: true },
        timestamp: Date.now(),
        gameId: '',
      });
    });
  }

  /**
   * 根据类型将传入消息路由到适当的处理器
   * @private
   * @description 根据 MessageType 将 GameMessage 调度到特定处理器。
   *              对未知消息类型发送错误响应。
   *
   * @param player - 发送消息的 ConnectedPlayer
   * @param message - 要处理的解析后的 GameMessage
   *
   * @see {@link handleJoinGame}
   * @see {@link handleMakeMove}
   * @see {@link handleLeaveGame}
   * @see {@link handlePing}
   * @see {@link handleAIMove}
   * @see {@link handleGetValidMoves}
   */
  private handleMessage(player: ConnectedPlayer, message: GameMessage): void {
    switch (message.type) {
      case MessageType.JOIN_GAME:
        this.handleJoinGame(player, message);
        break;
      case MessageType.MAKE_MOVE:
        this.handleMakeMove(player, message);
        break;
      case MessageType.LEAVE_GAME:
        this.handleLeaveGame(player, message);
        break;
      case MessageType.PING:
        this.handlePing(player);
        break;
      case MessageType.AI_MOVE:
        this.handleAIMove(player, message);
        break;
      case MessageType.GET_VALID_MOVES:
        this.handleGetValidMoves(player, message);
        break;
      default:
        this.sendError(player, 'Unknown message type');
    }
  }

  /**
   * 处理 JOIN_GAME 消息 - 创建或加入游戏
   * @private
   * @description 如果没有提供 gameId，则创建新游戏；或者加入现有游戏。
   *              加载指定的布局或使用标准布局作为默认。
   *              向游戏中的所有玩家广播 GAME_STATE。
   *
   * @param player - 加入游戏的 ConnectedPlayer
   * @param message - 包含可选 gameId、side、local 标志、layoutName 的消息
   *
   * @remarks
   * - 如果没有 gameId：使用指定或默认布局创建新游戏
   * - 如果提供了 gameId：如果可用则加入现有游戏
   * - 根据哪个玩家槽位可用分配 RED/BLACK 方
   * - 向游戏中的所有玩家发送带有其分配方的 GAME_STATE
   */
  private handleJoinGame(player: ConnectedPlayer, message: GameMessage): void {
    const { gameId, side, local, layoutName, ai, aiDifficulty } = message.payload as { gameId?: string; side?: Side; local?: boolean; layoutName?: string; ai?: boolean; aiDifficulty?: number };

    let targetGameId = gameId;
    let isNewGame = false;

    if (!targetGameId) {
      let layout: PieceLayout;
      if (layoutName) {
        try {
          layout = getLayout(layoutName);
        } catch (err) {
          this.loggerService.logWebSocketEvent('layout_fallback', player.playerId, undefined, {
            requestedLayout: layoutName,
            reason: err instanceof Error ? err.message : 'Unknown error',
          });
          layout = PieceLayout.fromJSON(standardLayoutData);
        }
      } else {
        layout = PieceLayout.fromJSON(standardLayoutData);
      }
      const newGame = this.gameManager.createGame(layout, local || false, ai || false, aiDifficulty);
      targetGameId = newGame.id;
      isNewGame = true;
    }

    const game = this.gameManager.joinGame(targetGameId!, player.playerId, side);

    if (!game) {
      this.loggerService.logWebSocketEvent('join_game_failed', player.playerId, targetGameId, {
        reason: 'Failed to join game',
        side,
        local: local || false,
      });
      this.sendError(player, 'Failed to join game');
      return;
    }

    player.gameId = targetGameId!;
    player.side = game.redPlayer === player.playerId ? Side.RED : Side.BLACK;

    this.loggerService.logWebSocketEvent('join_game', player.playerId, targetGameId, {
      side: player.side,
      isNewGame,
      local: local || false,
      ai: ai || false,
    });

    for (const p of this.players.values()) {
      if (p.gameId === targetGameId) {
        const yourSide = game.redPlayer === p.playerId ? Side.RED : Side.BLACK;
        this.sendToPlayer(p, {
          type: MessageType.GAME_STATE,
          payload: {
            game: this.sanitizeGameState(game),
            yourSide,
          },
          timestamp: Date.now(),
          gameId: targetGameId!,
        });
      }
    }
  }

  /**
   * 处理 MAKE_MOVE 消息 - 验证并执行象棋走动
   * @private
   * @description 验证走动坐标和玩家回合，然后通过 GameManager 执行走动。
   *              向所有玩家广播更新的 GAME_STATE。
   *              如果游戏结束，广播 GAME_OVER。
   *
   * @param player - 执行走动的 ConnectedPlayer
   * @param message - 包含 from 和 to 位置的消息
   *
   * @remarks
   * - 验证坐标在 0-9（行）和 0-8（列）范围内
   * - 如果玩家不在游戏中则返回错误
   * - 如果走动验证失败则返回错误
   * - 向双方玩家广播带有 lastMove 信息的 GAME_STATE
   * - 当将领被捕获时广播 GAME_OVER
   */
  private handleMakeMove(player: ConnectedPlayer, message: GameMessage): void {
    if (!player.gameId) {
      this.loggerService.logWebSocketEvent('make_move_not_in_game', player.playerId, undefined);
      this.sendError(player, 'Not in a game');
      return;
    }

    const { from, to } = message.payload as { from: Position; to: Position };

    if (!from || !to ||
        typeof from.row !== 'number' || typeof from.col !== 'number' ||
        typeof to.row !== 'number' || typeof to.col !== 'number' ||
        from.row < 0 || from.row > 9 || from.col < 0 || from.col > 8 ||
        to.row < 0 || to.row > 9 || to.col < 0 || to.col > 8) {
      this.loggerService.logWebSocketEvent('make_move_invalid_coords', player.playerId, player.gameId, { from, to });
      this.sendError(player, 'Invalid coordinates');
      return;
    }

    const result = this.gameManager.makeMove(player.gameId, player.playerId, from, to);

    if (!result.success) {
      this.loggerService.logWebSocketEvent('make_move_failed', player.playerId, player.gameId, {
        reason: result.error,
        from,
        to,
      });
      this.sendError(player, result.error || 'Move failed');
      return;
    }

    const game = result.game!;

    this.loggerService.logWebSocketEvent('make_move', player.playerId, player.gameId, {
      moveNumber: game.moves.length,
      from,
      to,
    });

    for (const p of this.players.values()) {
      if (p.gameId === player.gameId) {
        const yourSide = game.redPlayer === p.playerId ? Side.RED : Side.BLACK;
        this.sendToPlayer(p, {
          type: MessageType.GAME_STATE,
          payload: {
            game: this.sanitizeGameState(game),
            yourSide,
            lastMove: { from, to },
          },
          timestamp: Date.now(),
          gameId: player.gameId,
        });
      }
    }

    if (game.status === GameStatus.FINISHED) {
      this.loggerService.logWebSocketEvent('game_over', player.playerId, player.gameId, {
        winner: game.winner,
        reason: 'general_captured',
      });
      this.broadcastToGame(player.gameId, {
        type: MessageType.GAME_OVER,
        payload: {
          winner: game.winner,
          reason: 'general_captured',
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });
    } else if (result.needsAIMove && player.gameId) {
      // AI game mode: automatically trigger AI move after player's successful move
      setTimeout(() => {
        this.handleAIMoveInGame(player.gameId!);
      }, 500);
    }
  }

  /**
   * 处理 AI 在游戏中的走动 - 由 GameManager.makeAIMove() 调用
   * @private
   * @description 执行 AI 走动并广播更新后的游戏状态。
   *
   * @param gameId - AI 走动所在游戏的 ID
   */
  private handleAIMoveInGame(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game || game.status !== GameStatus.PLAYING) {
      return;
    }

    const aiResult = this.gameManager.makeAIMove(gameId, game.aiDifficulty);
    if (!aiResult.success) {
      this.loggerService.logWebSocketEvent('ai_move_failed', 'ai-player', gameId, {
        reason: aiResult.error,
      });
      return;
    }

    const updatedGame = aiResult.game!;
    const lastMove = updatedGame.moves[updatedGame.moves.length - 1];

    this.loggerService.logWebSocketEvent('ai_move', 'ai-player', gameId, {
      moveNumber: updatedGame.moves.length,
      from: lastMove.from,
      to: lastMove.to,
    });

    for (const p of this.players.values()) {
      if (p.gameId === gameId) {
        const yourSide = updatedGame.redPlayer === p.playerId ? Side.RED : Side.BLACK;
        this.sendToPlayer(p, {
          type: MessageType.GAME_STATE,
          payload: {
            game: this.sanitizeGameState(updatedGame),
            yourSide,
            lastMove: { from: lastMove.from, to: lastMove.to },
          },
          timestamp: Date.now(),
          gameId,
        });
      }
    }

    if (updatedGame.status === GameStatus.FINISHED) {
      this.loggerService.logWebSocketEvent('game_over', 'ai-player', gameId, {
        winner: updatedGame.winner,
        reason: 'general_captured',
      });
      this.broadcastToGame(gameId, {
        type: MessageType.GAME_OVER,
        payload: {
          winner: updatedGame.winner,
          reason: 'general_captured',
        },
        timestamp: Date.now(),
        gameId,
      });
    }
  }

  /**
   * 处理 LEAVE_GAME 消息 - 玩家主动离开游戏
   * @private
   * @description 通过 GameManager 将玩家从当前游戏中移除。
   *              向剩余玩家广播 PLAYER_DISCONNECTED。
   *
   * @param player - 离开游戏的 ConnectedPlayer
   * @param message - 离开游戏消息（有效载荷未使用）
   *
   * @remarks
   * - 玩家离开后清除 gameId 和 side
   * - 剩余玩家收到更新的游戏状态
   * - 游戏继续进行，直到剩余玩家完成
   */
  private handleLeaveGame(player: ConnectedPlayer, message: GameMessage): void {
    if (!player.gameId) {
      this.sendError(player, 'Not in a game');
      return;
    }

    const game = this.gameManager.leaveGame(player.gameId, player.playerId);

    if (game) {
      this.broadcastToGame(player.gameId, {
        type: MessageType.PLAYER_DISCONNECTED,
        payload: {
          playerId: player.playerId,
          game: this.sanitizeGameState(game),
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });
    }

    player.gameId = undefined;
    player.side = undefined;
  }

  /**
   * 处理 PING 消息 - 响应 PONG 并更新时间戳
   * @private
   * @description 更新玩家的 lastPing 并响应 PONG 消息。
   *              供客户端保持连接活跃并验证服务器响应能力。
   *
   * @param player - 发送 ping 的 ConnectedPlayer
   *
   * @remarks
   * - 在响应中返回当前服务器时间戳
   * - 更新 lastPing 以进行连接健康跟踪
   */
  private handlePing(player: ConnectedPlayer): void {
    player.lastPing = Date.now();
    this.sendToPlayer(player, {
      type: MessageType.PONG,
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
      gameId: player.gameId || '',
    });
  }

  /**
   * 处理 AI_MOVE 消息 - 请求 AI 走动计算
   * @private
   * @description AI 对手集成的占位符。
   *              当请求 AI 走动时，调用 GameManager.makeAIMove()。
   *
   * @param player - 请求 AI 走动的 ConnectedPlayer
   * @param message - AI 走动请求消息
   *
   * @remarks
   * - 如果 AI 未通过 chessConfig 启用则返回错误
   * - 完整的 AI 走动逻辑由 GameManager.makeAIMove() 处理
   */
  private handleAIMove(player: ConnectedPlayer, message: GameMessage): void {
    if (!this.config.ai.enabled) {
      this.loggerService.logWebSocketEvent('ai_move_disabled', player.playerId, player.gameId);
      this.sendError(player, 'AI is not enabled');
      return;
    }

    if (!player.gameId) {
      this.loggerService.logWebSocketEvent('ai_move_not_in_game', player.playerId, undefined);
      this.sendError(player, 'Not in a game');
      return;
    }

    this.handleAIMoveInGame(player.gameId);
  }

  /**
   * 处理 GET_VALID_MOVES 消息 - 获取棋子的合法走动
   * @private
   * @description 查询 GameManager 获取位于给定位置的棋子的所有合法走动。
   *              返回有效目标位置数组。
   *
   * @param player - 请求合法走动的 ConnectedPlayer
   * @param message - 包含要评估的棋子位置的消息
   *
   * @returns 带有有效目标位置数组的 VALID_MOVES 消息
   *
   * @remarks
   * - 位置坐标必须是有效数字
   * - 如果没有有效走动可用则返回空数组
   * - 供前端用来高亮显示有效的走动目标
   */
  private handleGetValidMoves(player: ConnectedPlayer, message: GameMessage): void {
    if (!player.gameId) {
      this.loggerService.logWebSocketEvent('get_valid_moves_not_in_game', player.playerId, undefined);
      this.sendError(player, 'Not in a game');
      return;
    }

    const { position } = message.payload as { position: Position };

    if (!position || typeof position.row !== 'number' || typeof position.col !== 'number') {
      this.loggerService.logWebSocketEvent('get_valid_moves_invalid_position', player.playerId, player.gameId, { position });
      this.sendError(player, 'Invalid position');
      return;
    }

    const validMoves = this.gameManager.getValidMoves(
      player.gameId,
      player.playerId,
      position
    );

    this.loggerService.logWebSocketEvent('get_valid_moves', player.playerId, player.gameId, {
      position,
      moveCount: validMoves.length,
    });

    this.sendToPlayer(player, {
      type: MessageType.VALID_MOVES,
      payload: { moves: validMoves },
      timestamp: Date.now(),
      gameId: player.gameId,
    });
  }

  /**
   * 处理 WebSocket 断开连接 - 管理清理和重连窗口
   * @private
   * @description 处理玩家断开连接：
   *              - 清除任何待处理的重连超时
   *              - 向游戏广播 PLAYER_DISCONNECTED
   *              - 在判负之前设置 30 秒重连窗口
   *              - 超时后从 players 映射中移除玩家
   *
   * @param player - 断开连接的 ConnectedPlayer
   *
   * @remarks
   * - 如果玩家在超时内重新连接，他们保留游戏槽位
   * - 如果超时到期，玩家被判负，游戏可能结束
   * - 使用 this.config.game.reconnectTimeoutMs 作为超时持续时间
   */
  private handleDisconnect(player: ConnectedPlayer): void {
    if (player.reconnectTimeout) {
      clearTimeout(player.reconnectTimeout);
      player.reconnectTimeout = undefined;
    }

    if (player.gameId) {
      this.broadcastToGame(player.gameId, {
        type: MessageType.PLAYER_DISCONNECTED,
        payload: {
          playerId: player.playerId,
          message: 'Player disconnected',
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });

      player.reconnectTimeout = setTimeout(() => {
        const reconnected = this.players.get(player.playerId);
        if (!reconnected || !reconnected.gameId) {
          const game = this.gameManager.leaveGame(player.gameId!, player.playerId);
          if (game) {
            this.loggerService.logWebSocketEvent('game_over_disconnect', player.playerId, player.gameId!, {
              winner: game.winner,
              reason: 'player_disconnect',
            });
            this.broadcastToGame(player.gameId!, {
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
      }, this.config.game.reconnectTimeoutMs);
    }

    this.players.delete(player.playerId);
  }

  /**
   * 向特定玩家发送消息
   * @private
   * @description 如果连接处于 OPEN 状态，则将 GameMessage 序列化并发送到玩家的 WebSocket。
   *
   * @param player - 要发送消息的 ConnectedPlayer
   * @param message - 要发送的 GameMessage
   *
   * @remarks
   * - 发送前检查 readyState 以避免错误
   * - 将消息对象 JSON 字符串化
   */
  private sendToPlayer(player: ConnectedPlayer, message: GameMessage): void {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 向游戏中的所有玩家广播消息
   * @private
   * @description 向当前位于指定游戏中的所有已连接玩家发送消息。
   *
   * @param gameId - 要广播到的游戏 ID
   * @param message - 要发送给每个玩家的 GameMessage
   *
   * @see {@link sendToPlayer}
   */
  private broadcastToGame(gameId: string, message: GameMessage): void {
    for (const player of this.players.values()) {
      if (player.gameId === gameId) {
        this.sendToPlayer(player, message);
      }
    }
  }

  /**
   * 向玩家发送错误消息
   * @private
   * @description 发送 ERROR 消息类型给玩家的便捷方法。
   *
   * @param player - 要发送错误的 ConnectedPlayer
   * @param error - 错误消息字符串
   *
   * @see {@link sendToPlayer}
   */
  private sendError(player: ConnectedPlayer, error: string): void {
    this.sendToPlayer(player, {
      type: MessageType.ERROR,
      payload: { error },
      timestamp: Date.now(),
      gameId: player.gameId || '',
    });
  }

  /**
   * 在发送到客户端之前从游戏状态中移除敏感数据
   * @private
   * @description 创建清理过的游戏状态对象：
   *              - 省略实际玩家 ID（用布尔值替换）
   *              - 仅包含适合客户端使用的安全字段
   *
   * @param game - 来自 GameManager 的完整 GameState
   * @returns 可安全发送给客户端的清理过的游戏状态对象
   */
  private sanitizeGameState(game: import('@chess/core').GameState) {
    return {
      id: game.id,
      board: game.board,
      currentTurn: game.currentTurn,
      moves: game.moves,
      status: game.status,
      winner: game.winner,
      redPlayer: game.redPlayer ? true : false,
      blackPlayer: game.blackPlayer ? true : false,
      lastMoveTime: game.lastMoveTime,
      createdAt: game.createdAt,
      localGame: game.localGame || false,
      aiGame: game.aiGame || false,
    };
  }

  /**
   * 启动连接健康检查的 ping 间隔
   * @private
   * @description 启动 30 秒间隔：
   *              - 为所有玩家设置 isAlive = false
   *              - 向每个玩家发送 ping
   *              - 如果未收到 pong（isAlive 保持 false）则终止连接
   *
   * @remarks
   * - 使用 WebSocket ping() 方法
   * - Pong 处理器设置 isAlive = true
   * - 没有 pong 响应的连接被终止
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const player of this.players.values()) {
        if (!player.isAlive) {
          player.ws.terminate();
          this.handleDisconnect(player);
          continue;
        }
        player.isAlive = false;
        player.ws.ping();
      }
    }, 30000);
  }

  /**
   * 启动不活跃游戏清理的清理间隔
   * @private
   * @description 启动 10 分钟间隔：
   *              - 调用 GameManager.cleanupInactiveGames(3600000)
   *              - 如果有游戏被清理则记录清理数量
   *
   * @remarks
   * - 清理 1 小时（3600000 毫秒）不活跃的游戏
   * - 仅在实际清理游戏时记录
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.gameManager.cleanupInactiveGames(3600000);
      if (cleaned > 0) {
        this.loggerService.logWebSocketEvent('cleanup', 'system', undefined, { cleaned });
      }
    }, 600000);
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
