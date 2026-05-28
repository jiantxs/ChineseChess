/**
 * @fileoverview 处理实时多人游戏的 WebSocket 游戏服务器
 * @module backend/src/services/gameServer/messageHandlers
 *
 * 管理中国象棋多人游戏的 WebSocket 连接。
 * 处理玩家认证、游戏创建/加入、走动验证，
 * 以及实时游戏状态同步。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

import { WebSocket, RawData } from 'ws';
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
import type { LoggerInstance } from '@chess/logger';
import { getLayout, standardLayoutData } from '@chess/game-records';
import type { ConnectedPlayer } from './types';
import {
  sendToPlayer,
  broadcastToGame,
  sendError,
  handleDisconnect,
} from './connectionManager';
import type { GameState } from '@chess/core';

/**
 * 根据类型将传入消息路由到适当的处理器
 * @description 根据 MessageType 将 GameMessage 调度到特定处理器。
 *              对未知消息类型发送错误响应。
 *
 * @param player - 发送消息的 ConnectedPlayer
 * @param message - 要处理的解析后的 GameMessage
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param config - ChessConfig 实例
 * @param logger - LoggerInstance 实例
 *
 * @see {@link handleJoinGame}
 * @see {@link handleMakeMove}
 * @see {@link handleLeaveGame}
 * @see {@link handlePing}
 * @see {@link handleAIMove}
 * @see {@link handleGetValidMoves}
 */
export function handleMessage(
  player: ConnectedPlayer,
  message: GameMessage,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  config: ChessConfig,
  logger: LoggerInstance
): void {
  switch (message.type) {
    case MessageType.JOIN_GAME:
      handleJoinGame(player, message, players, gameManager, logger);
      break;
    case MessageType.MAKE_MOVE:
      handleMakeMove(player, message, players, gameManager, logger);
      break;
    case MessageType.LEAVE_GAME:
      handleLeaveGame(player, message, players, gameManager, logger);
      break;
    case MessageType.PING:
      handlePing(player);
      break;
    case MessageType.AI_MOVE:
      handleAIMove(player, message, players, gameManager, config, logger);
      break;
    case MessageType.GET_VALID_MOVES:
      handleGetValidMoves(player, message, gameManager, logger);
      break;
    default:
      sendError(player, 'Unknown message type');
  }
}

/**
 * 处理 JOIN_GAME 消息 - 创建或加入游戏
 * @description 如果没有提供 gameId，则创建新游戏；或者加入现有游戏。
 *              加载指定的布局或使用标准布局作为默认。
 *              向游戏中的所有玩家广播 GAME_STATE。
 *
 * @param player - 加入游戏的 ConnectedPlayer
 * @param message - 包含可选 gameId、side、local 标志、layoutName 的消息
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 如果没有 gameId：使用指定或默认布局创建新游戏
 * - 如果提供了 gameId：如果可用则加入现有游戏
 * - 根据哪个玩家槽位可用分配 RED/BLACK 方
 * - 向游戏中的所有玩家发送带有其分配方的 GAME_STATE
 */
export function handleJoinGame(
  player: ConnectedPlayer,
  message: GameMessage,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  logger: LoggerInstance
): void {
  const { gameId, side, local, layoutName, ai, aiDifficulty } = message.payload as { gameId?: string; side?: Side; local?: boolean; layoutName?: string; ai?: boolean; aiDifficulty?: number };

  let targetGameId = gameId;
  let isNewGame = false;

  if (!targetGameId) {
    let layout: PieceLayout;
    if (layoutName) {
      try {
        layout = getLayout(layoutName);
      } catch (err) {
        logger.logWebSocketEvent('layout_fallback', player.playerId, undefined, {
          requestedLayout: layoutName,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
        layout = PieceLayout.fromJSON(standardLayoutData);
      }
    } else {
      layout = PieceLayout.fromJSON(standardLayoutData);
    }
    const newGame = gameManager.createGame(layout, local || false, ai || false, aiDifficulty);
    targetGameId = newGame.id;
    isNewGame = true;
  }

  const game = gameManager.joinGame(targetGameId!, player.playerId, side);

  if (!game) {
    logger.logWebSocketEvent('join_game_failed', player.playerId, targetGameId, {
      reason: 'Failed to join game',
      side,
      local: local || false,
    });
    sendError(player, 'Failed to join game');
    return;
  }

  player.gameId = targetGameId!;
  player.side = game.redPlayer === player.playerId ? Side.RED : Side.BLACK;

  logger.logWebSocketEvent('join_game', player.playerId, targetGameId, {
    side: player.side,
    isNewGame,
    local: local || false,
    ai: ai || false,
  });

  for (const p of players.values()) {
    if (p.gameId === targetGameId) {
      const yourSide = game.redPlayer === p.playerId ? Side.RED : Side.BLACK;
      sendToPlayer(p, {
        type: MessageType.GAME_STATE,
        payload: {
          game: sanitizeGameState(game),
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
 * @description 验证走动坐标和玩家回合，然后通过 GameManager 执行走动。
 *              向所有玩家广播更新的 GAME_STATE。
 *              如果游戏结束，广播 GAME_OVER。
 *
 * @param player - 执行走动的 ConnectedPlayer
 * @param message - 包含 from 和 to 位置的消息
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 验证坐标在 0-9（行）和 0-8（列）范围内
 * - 如果玩家不在游戏中则返回错误
 * - 如果走动验证失败则返回错误
 * - 向双方玩家广播带有 lastMove 信息的 GAME_STATE
 * - 当将领被捕获时广播 GAME_OVER
 */
export function handleMakeMove(
  player: ConnectedPlayer,
  message: GameMessage,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  logger: LoggerInstance
): void {
  if (!player.gameId) {
    logger.logWebSocketEvent('make_move_not_in_game', player.playerId, undefined);
    sendError(player, 'Not in a game');
    return;
  }

  const { from, to } = message.payload as { from: Position; to: Position };

  if (!from || !to ||
      typeof from.row !== 'number' || typeof from.col !== 'number' ||
      typeof to.row !== 'number' || typeof to.col !== 'number' ||
      from.row < 0 || from.row > 9 || from.col < 0 || from.col > 8 ||
      to.row < 0 || to.row > 9 || to.col < 0 || to.col > 8) {
    logger.logWebSocketEvent('make_move_invalid_coords', player.playerId, player.gameId, { from, to });
    sendError(player, 'Invalid coordinates');
    return;
  }

  const result = gameManager.makeMove(player.gameId, player.playerId, from, to);

  if (!result.success) {
    logger.logWebSocketEvent('make_move_failed', player.playerId, player.gameId, {
      reason: result.error,
      from,
      to,
    });
    sendError(player, result.error || 'Move failed');
    return;
  }

  const game = result.game!;

  logger.logWebSocketEvent('make_move', player.playerId, player.gameId, {
    moveNumber: game.moves.length,
    from,
    to,
  });

  for (const p of players.values()) {
    if (p.gameId === player.gameId) {
      const yourSide = game.redPlayer === p.playerId ? Side.RED : Side.BLACK;
      sendToPlayer(p, {
        type: MessageType.GAME_STATE,
        payload: {
          game: sanitizeGameState(game),
          yourSide,
          lastMove: { from, to },
        },
        timestamp: Date.now(),
        gameId: player.gameId,
      });
    }
  }

  if (game.status === GameStatus.FINISHED) {
    logger.logWebSocketEvent('game_over', player.playerId, player.gameId, {
      winner: game.winner,
      reason: 'general_captured',
    });
    broadcastToGame(players, player.gameId, {
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
      handleAIMoveInGame(player.gameId!, players, gameManager, logger);
    }, 500);
  }
}

/**
 * 处理 AI 在游戏中的走动 - 由 GameManager.makeAIMove() 调用
 * @description 执行 AI 走动并广播更新后的游戏状态。
 *
 * @param gameId - AI 走动所在游戏的 ID
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param logger - LoggerInstance 实例
 */
export function handleAIMoveInGame(
  gameId: string,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  logger: LoggerInstance
): void {
  const game = gameManager.getGame(gameId);
  if (!game || game.status !== GameStatus.PLAYING) {
    return;
  }

  const aiResult = gameManager.makeAIMove(gameId, game.aiDifficulty);
  if (!aiResult.success) {
    logger.logWebSocketEvent('ai_move_failed', 'ai-player', gameId, {
      reason: aiResult.error,
    });
    return;
  }

  const updatedGame = aiResult.game!;
  const lastMove = updatedGame.moves[updatedGame.moves.length - 1];

  logger.logWebSocketEvent('ai_move', 'ai-player', gameId, {
    moveNumber: updatedGame.moves.length,
    from: lastMove.from,
    to: lastMove.to,
  });

  for (const p of players.values()) {
    if (p.gameId === gameId) {
      const yourSide = updatedGame.redPlayer === p.playerId ? Side.RED : Side.BLACK;
      sendToPlayer(p, {
        type: MessageType.GAME_STATE,
        payload: {
          game: sanitizeGameState(updatedGame),
          yourSide,
          lastMove: { from: lastMove.from, to: lastMove.to },
        },
        timestamp: Date.now(),
        gameId,
      });
    }
  }

  if (updatedGame.status === GameStatus.FINISHED) {
    logger.logWebSocketEvent('game_over', 'ai-player', gameId, {
      winner: updatedGame.winner,
      reason: 'general_captured',
    });
    broadcastToGame(players, gameId, {
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
 * @description 通过 GameManager 将玩家从当前游戏中移除。
 *              向剩余玩家广播 PLAYER_DISCONNECTED。
 *
 * @param player - 离开游戏的 ConnectedPlayer
 * @param message - 离开游戏消息（有效载荷未使用）
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 玩家离开后清除 gameId 和 side
 * - 剩余玩家收到更新的游戏状态
 * - 游戏继续进行，直到剩余玩家完成
 */
export function handleLeaveGame(
  player: ConnectedPlayer,
  message: GameMessage,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  logger: LoggerInstance
): void {
  if (!player.gameId) {
    sendError(player, 'Not in a game');
    return;
  }

  const game = gameManager.leaveGame(player.gameId, player.playerId);

  if (game) {
    broadcastToGame(players, player.gameId, {
      type: MessageType.PLAYER_DISCONNECTED,
      payload: {
        playerId: player.playerId,
        game: sanitizeGameState(game),
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
 * @description 更新玩家的 lastPing 并响应 PONG 消息。
 *              供客户端保持连接活跃并验证服务器响应能力。
 *
 * @param player - 发送 ping 的 ConnectedPlayer
 *
 * @remarks
 * - 在响应中返回当前服务器时间戳
 * - 更新 lastPing 以进行连接健康跟踪
 */
export function handlePing(player: ConnectedPlayer): void {
  player.lastPing = Date.now();
  sendToPlayer(player, {
    type: MessageType.PONG,
    payload: { timestamp: Date.now() },
    timestamp: Date.now(),
    gameId: player.gameId || '',
  });
}

/**
 * 处理 AI_MOVE 消息 - 请求 AI 走动计算
 * @description AI 对手集成的占位符。
 *              当请求 AI 走动时，调用 GameManager.makeAIMove()。
 *
 * @param player - 请求 AI 走动的 ConnectedPlayer
 * @param message - AI 走动请求消息
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param config - ChessConfig 实例
 * @param logger - LoggerInstance 实例
 *
 * @remarks
 * - 如果 AI 未通过 chessConfig 启用则返回错误
 * - 完整的 AI 走动逻辑由 GameManager.makeAIMove() 处理
 */
export function handleAIMove(
  player: ConnectedPlayer,
  message: GameMessage,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  config: ChessConfig,
  logger: LoggerInstance
): void {
  if (!config.ai.enabled) {
    logger.logWebSocketEvent('ai_move_disabled', player.playerId, player.gameId);
    sendError(player, 'AI is not enabled');
    return;
  }

  if (!player.gameId) {
    logger.logWebSocketEvent('ai_move_not_in_game', player.playerId, undefined);
    sendError(player, 'Not in a game');
    return;
  }

  handleAIMoveInGame(player.gameId, players, gameManager, logger);
}

/**
 * 处理 GET_VALID_MOVES 消息 - 获取棋子的合法走动
 * @description 查询 GameManager 获取位于给定位置的棋子的所有合法走动。
 *              返回有效目标位置数组。
 *
 * @param player - 请求合法走动的 ConnectedPlayer
 * @param message - 包含要评估的棋子位置的消息
 * @param gameManager - GameManager 实例
 * @param logger - LoggerInstance 实例
 *
 * @returns 带有有效目标位置数组的 VALID_MOVES 消息
 *
 * @remarks
 * - 位置坐标必须是有效数字
 * - 如果没有有效走动可用则返回空数组
 * - 供前端用来高亮显示有效的走动目标
 */
export function handleGetValidMoves(
  player: ConnectedPlayer,
  message: GameMessage,
  gameManager: GameManager,
  logger: LoggerInstance
): void {
  if (!player.gameId) {
    logger.logWebSocketEvent('get_valid_moves_not_in_game', player.playerId, undefined);
    sendError(player, 'Not in a game');
    return;
  }

  const { position } = message.payload as { position: Position };

  if (!position || typeof position.row !== 'number' || typeof position.col !== 'number') {
    logger.logWebSocketEvent('get_valid_moves_invalid_position', player.playerId, player.gameId, { position });
    sendError(player, 'Invalid position');
    return;
  }

  const validMoves = gameManager.getValidMoves(
    player.gameId,
    player.playerId,
    position
  );

  logger.logWebSocketEvent('get_valid_moves', player.playerId, player.gameId, {
    position,
    moveCount: validMoves.length,
  });

  sendToPlayer(player, {
    type: MessageType.VALID_MOVES,
    payload: { moves: validMoves },
    timestamp: Date.now(),
    gameId: player.gameId,
  });
}

/**
 * 在发送到客户端之前从游戏状态中移除敏感数据
 * @description 创建清理过的游戏状态对象：
 *              - 省略实际玩家 ID（用布尔值替换）
 *              - 仅包含适合客户端使用的安全字段
 *
 * @param game - 来自 GameManager 的完整 GameState
 * @returns 可安全发送给客户端的清理过的游戏状态对象
 */
export function sanitizeGameState(game: GameState) {
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
 * 设置 WebSocket 服务器连接处理器
 * @description 为以下事件注册处理器：
 *              - Connection（验证 playerId，注册玩家）
 *              - Message（解析 JSON，路由到处理器）
 *              - Close（处理断开连接，附带重连窗口）
 *              - Pong（更新 isAlive 标志）
 *
 * @param wss - WebSocketServer 实例
 * @param players - 所有玩家的 Map
 * @param gameManager - GameManager 实例
 * @param config - ChessConfig 实例
 * @param logger - LoggerInstance 实例
 * @param onConnected - 连接成功后的回调
 *
 * @remarks
 * - 如果没有 playerId 查询参数，以代码 1008 拒绝连接
 * - 成功连接后发送初始 PONG 消息
 * - 将消息解析为 JSON GameMessage 对象
 * - 通过 logWebSocketEvent 记录所有事件
 */
export function setupWebSocketServer(
  wss: WebSocketServer,
  players: Map<string, ConnectedPlayer>,
  gameManager: GameManager,
  config: ChessConfig,
  logger: LoggerInstance,
  onConnected: (player: ConnectedPlayer) => void
): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
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

    players.set(playerId, player);

    logger.logWebSocketEvent('connection', playerId);

    ws.on('message', (data: RawData) => {
      try {
        const message: GameMessage = JSON.parse(data.toString());
        logger.logWebSocketEvent('message', playerId, message.gameId, {
          messageType: message.type,
        });
        handleMessage(player, message, players, gameManager, config, logger);
      } catch (error) {
        logger.logError('websocket_message_parse_error', error as Error, { playerId });
        sendError(player, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      logger.logWebSocketEvent('disconnect', playerId, player.gameId);
      handleDisconnect(player, players, gameManager, config, logger);
    });

    ws.on('pong', () => {
      player.isAlive = true;
      player.lastPing = Date.now();
    });

    sendToPlayer(player, {
      type: MessageType.PONG,
      payload: { connected: true },
      timestamp: Date.now(),
      gameId: '',
    });

    onConnected(player);
  });
}

import { WebSocketServer } from 'ws';