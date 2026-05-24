import { v4 as uuidv4 } from 'uuid';
import type { GameState, Piece, Move, Position } from './types';
import { GameStatus, Side, BOARD_ROWS, BOARD_COLS } from './types';
import { isValidMove, isGeneralCaptured, getValidMoves as getValidMovesLogic } from './gameLogic';
import { PieceLayout } from './pieceLayout';
import { gameLogger } from './gameLogger';
import { AIEngine } from './ai';

/**
 * 将用户偏好难度 (1-10) 转换为 AI 搜索深度
 * 难度越高，搜索深度越大，AI 越强
 */
function difficultyToDepth(difficulty: number): number {
  if (difficulty <= 3) return difficulty === 1 ? 1 : 2;
  if (difficulty <= 6) return difficulty <= 4 ? 3 : 4;
  if (difficulty <= 9) return difficulty <= 7 ? 5 : 6;
  return 8;
}

/**
 * GameManager - 中国象棋内存游戏状态管理器。
 *
 * 每个服务器应创建独立的 GameManager 实例以避免状态冲突。
 * 它维护：
 * - `games`：Map<gameId, GameState> - 所有活跃和已结束的游戏
 * - `playerGames`：Map<playerId, gameId> - 玩家到游戏的映射
 *
 * 用法：
 *   import { GameManager } from '@chess/core';
 *   const gameManager = new GameManager();
 *   const game = gameManager.createGame(layout);
 *
 * 重要提示：cleanupInactiveGames 方法必须由外部调用
 *（例如由定时任务或 WebSocket 服务器调用）以定期
 * 从内存中删除已结束/已中止的游戏。
 *
 * @module GameManager
 */
export class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerGames: Map<string, string> = new Map();

  private aiEngine: AIEngine;

  constructor() {
    this.aiEngine = new AIEngine();
  }

  /**
   * 使用给定的布局和可选的本地模式创建新游戏。
   * 在创建之前结束任何仍处于 PLAYING 或 WAITING 状态的游戏。
   * @param layout - 定义初始棋盘布局的 PieceLayout 实例
   * @param local - 如果为 true，则为热座模式（双方为同一玩家）
   * @param ai - 如果为 true，则为 AI 对战模式（玩家执红，AI 执黑）
   * @param aiDifficulty - 可选的 AI 难度级别（1-10），仅在 ai 为 true 时使用
   * @returns 新创建的 GameState
   */
  createGame(layout: PieceLayout, local: boolean = false, ai: boolean = false, aiDifficulty?: number): GameState {
    for (const [gameId, game] of this.games.entries()) {
      if (game.status === GameStatus.PLAYING || game.status === GameStatus.WAITING) {
        game.status = GameStatus.FINISHED;
        game.winner = game.redPlayer ? Side.RED : Side.BLACK;
        if (game.redPlayer) this.playerGames.delete(game.redPlayer);
        if (game.blackPlayer) this.playerGames.delete(game.blackPlayer);
      }
    }

    const gameId = uuidv4();
    const board = this.buildBoard(layout.getInitialPieces());

    const game: GameState = {
      id: gameId,
      board,
      currentTurn: layout.getFirstPlayer(),
      moves: [],
      status: local ? GameStatus.PLAYING : GameStatus.WAITING,
      lastMoveTime: Date.now(),
      createdAt: Date.now(),
      localGame: local,
      aiGame: ai,
      aiDifficulty: ai ? (aiDifficulty ?? 5) : undefined,
    };

    if (ai) {
      game.status = GameStatus.PLAYING;
      game.blackPlayer = 'ai-player';
    }

    this.games.set(gameId, game);

    gameLogger.info('Game created', {
      gameId,
      layout: layout.getName(),
      firstPlayer: layout.getFirstPlayer(),
      local,
      ai,
      initialBoard: board.map(row => row.map(p => p ? { id: p.id, type: p.type, side: p.side, position: p.position } : null)),
    });

    return game;
  }

  /**
   * 通过唯一标识符检索游戏。
   * @param gameId - 要检索的游戏的 UUID
   * @returns 如果找到则返回 GameState，否则返回 undefined
   */
  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  /**
   * 将玩家添加到现有游戏或创建本地游戏。
   * 对于本地游戏，双方都分配给同一玩家。
   * 对于在线游戏，玩家加入指定方或可用方。
   * @param gameId - 要加入的游戏
   * @param playerId - 玩家的唯一标识符
   * @param side - 可选的要加入的特定方（RED/BLACK）
   * @returns 如果加入成功则返回更新后的 GameState，否则返回 null
   */
  joinGame(gameId: string, playerId: string, side?: Side): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      gameLogger.warn('joinGame failed - game not found', { gameId, playerId, side });
      return null;
    }

    if (game.status !== GameStatus.WAITING && !game.localGame && !game.aiGame) {
      gameLogger.warn('joinGame failed - game not waiting', { gameId, playerId, side, status: game.status });
      return null;
    }

    // 对于本地游戏，将双方分配给同一个 playerId
    if (game.localGame) {
      game.redPlayer = playerId;
      game.blackPlayer = playerId;
      this.playerGames.set(playerId, gameId);
      game.status = GameStatus.PLAYING;

      gameLogger.info('Local game joined', {
        gameId,
        playerId,
        side: Side.RED,
      });
      return game;
    }

    // 对于 AI 游戏，玩家自动加入红方
    if (game.aiGame) {
      game.redPlayer = playerId;
      this.playerGames.set(playerId, gameId);
      game.status = GameStatus.PLAYING;

      gameLogger.info('AI game joined', {
        gameId,
        playerId,
        side: Side.RED,
      });
      return game;
    }

    if (side === Side.RED && game.redPlayer) {
      gameLogger.warn('joinGame failed - side occupied', { gameId, playerId, side, existingPlayer: game.redPlayer });
      return null;
    }
    if (side === Side.BLACK && game.blackPlayer) {
      gameLogger.warn('joinGame failed - side occupied', { gameId, playerId, side, existingPlayer: game.blackPlayer });
      return null;
    }

    if (!side) {
      if (!game.redPlayer) side = Side.RED;
      else if (!game.blackPlayer) side = Side.BLACK;
      else {
        gameLogger.warn('joinGame failed - no sides available', { gameId, playerId });
        return null;
      }
    }

    if (side === Side.RED) {
      game.redPlayer = playerId;
    } else {
      game.blackPlayer = playerId;
    }

    this.playerGames.set(playerId, gameId);

    if (game.redPlayer && game.blackPlayer) {
      game.status = GameStatus.PLAYING;
    }

    gameLogger.info('Player joined game', {
      gameId,
      playerId,
      side,
      status: game.status,
    });

    return game;
  }

  /**
   * 在指定游戏中执行移动。
   * 在应用之前验证回合顺序、棋子所有权和移动合法性。
   * 更新棋盘、记录移动、切换回合并检查获胜条件。
   * @param gameId - 要进行移动的游戏
   * @param playerId - 执行移动的玩家
   * @param from - 源位置 {row, col}
   * @param to - 目标位置 {row, col}
   * @returns 包含成功标志的对象，如果成功则返回更新后的游戏，或错误消息
   */
  makeMove(
    gameId: string,
    playerId: string,
    from: Position,
    to: Position
  ): { success: boolean; game?: GameState; error?: string; needsAIMove?: boolean } {
    const game = this.games.get(gameId);
    if (!game) {
      gameLogger.warn('makeMove failed - game not found', { gameId, playerId, from, to });
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== GameStatus.PLAYING) {
      gameLogger.warn('makeMove failed - game not in progress', { gameId, playerId, from, to, status: game.status });
      return { success: false, error: 'Game is not in progress' };
    }

    const isRedTurn = game.currentTurn === Side.RED;

    if (!game.localGame) {
      const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
      if (expectedPlayer !== playerId) {
        gameLogger.warn('makeMove failed - not your turn', { gameId, playerId, from, to, expectedPlayer, currentTurn: game.currentTurn });
        return { success: false, error: 'Not your turn' };
      }
    }

    const piece = game.board[from.row][from.col];
    if (!piece) {
      gameLogger.warn('makeMove failed - no piece at source', { gameId, playerId, from, to });
      return { success: false, error: 'No piece at source position' };
    }

    if (piece.side !== game.currentTurn) {
      gameLogger.warn('makeMove failed - cannot move opponent piece', { gameId, playerId, from, to, pieceSide: piece.side, currentTurn: game.currentTurn });
      return { success: false, error: 'Cannot move opponent piece' };
    }

    if (!isValidMove(game.board, piece, from, to)) {
      gameLogger.warn('makeMove failed - invalid move', { gameId, playerId, from, to, pieceType: piece.type, pieceSide: piece.side });
      return { success: false, error: 'Invalid move' };
    }

    const capturedPiece = game.board[to.row][to.col];

    const move: Move = {
      from: { ...from },
      to: { ...to },
      piece: { ...piece, position: { ...to } },
      capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
    };

    game.board[to.row][to.col] = { ...piece, position: { ...to } };
    game.board[from.row][from.col] = null;
    game.moves.push(move);
    game.currentTurn = isRedTurn ? Side.BLACK : Side.RED;
    game.lastMoveTime = Date.now();

    gameLogger.info('Move made', {
      gameId,
      playerId,
      moveNumber: game.moves.length,
      from,
      to,
      piece: { type: piece.type, side: piece.side },
      capturedPiece: capturedPiece ? { type: capturedPiece.type, side: capturedPiece.side } : null,
      currentTurn: game.currentTurn,
    });

    const generalStatus = isGeneralCaptured(game.board);
    if (generalStatus.captured) {
      game.status = GameStatus.FINISHED;
      game.winner = generalStatus.winner;

      gameLogger.info('Game finished', {
        gameId,
        winner: generalStatus.winner,
        reason: 'general_captured',
        totalMoves: game.moves.length,
      });
    }

    const needsAIMove = game.aiGame && game.status === GameStatus.PLAYING && !generalStatus.captured;

    return { success: true, game, needsAIMove };
  }

  /**
   * 从游戏中移除玩家。
   * 对于进行中的游戏，这会使离开的玩家判负。
   * 如果双方玩家都离开，游戏将被删除。
   * @param gameId - 要离开的游戏
   * @param playerId - 离开游戏的玩家
   * @returns 如果游戏继续则返回更新后的 GameState，如果游戏被删除则返回 null
   */
  leaveGame(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      gameLogger.warn('leaveGame failed - game not found', { gameId, playerId });
      return null;
    }

    const wasRedPlayer = game.redPlayer === playerId;
    if (wasRedPlayer) {
      game.redPlayer = undefined;
    } else if (game.blackPlayer === playerId) {
      game.blackPlayer = undefined;
    } else {
      gameLogger.warn('leaveGame failed - player not in game', { gameId, playerId });
      return null;
    }

    this.playerGames.delete(playerId);

    if (game.status === GameStatus.PLAYING) {
      game.status = GameStatus.ABORTED;
      game.winner = wasRedPlayer ? Side.BLACK : Side.RED;

      gameLogger.info('Game aborted due to player leaving', {
        gameId,
        playerId,
        winner: game.winner,
        reason: 'player_left',
      });
    } else if (game.status === GameStatus.WAITING) {
      gameLogger.info('Player left waiting game', {
        gameId,
        playerId,
        wasRedPlayer,
      });
    }

    if (!game.redPlayer && !game.blackPlayer) {
      this.games.delete(gameId);
      gameLogger.info('Game deleted - all players left', { gameId });
      return null;
    }

    return game;
  }

  /**
   * 查找玩家当前所在的游戏。
   * @param playerId - 玩家的唯一标识符
   * @returns 如果玩家在游戏中则返回 GameState，否则返回 undefined
   */
  getPlayerGame(playerId: string): GameState | undefined {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  /**
   * 获取给定位置上棋子的所有合法目标位置。
   * 验证是否是玩家的回合（对于在线游戏）。
   * @param gameId - 要查询的游戏
   * @param playerId - 请求合法移动的玩家（验证回合）
   * @param position - 要获取移动的棋子的 {row, col}
   * @returns 合法目标位置的数组
   */
  getValidMoves(gameId: string, playerId: string, position: Position): Position[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    const piece = game.board[position.row][position.col];
    if (!piece) return [];

    // 对于本地游戏，双方玩家都可以控制任何棋子
    // 对于在线游戏，只有当前回合的玩家才能移动
    if (!game.localGame) {
      const isRedTurn = game.currentTurn === Side.RED;
      const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
      if (expectedPlayer !== playerId) return [];
    }

    if (piece.side !== game.currentTurn) return [];

return getValidMovesLogic(game.board, piece);
  }

  /**
   * 删除早于指定最大时间的已结束或已中止的游戏。
   * @param maxAgeMs - 以毫秒为单位的最大时间（例如 3600000 代表 1 小时）
   * @returns 清理的游戏数量
   */
  cleanupInactiveGames(maxAgeMs: number): number {
    const now = Date.now();
    let cleaned = 0;
    const cleanedGameIds: string[] = [];

    for (const [gameId, game] of this.games.entries()) {
      if (game.status === GameStatus.FINISHED || game.status === GameStatus.ABORTED) {
        if (now - game.lastMoveTime > maxAgeMs) {
          this.games.delete(gameId);
          if (game.redPlayer) this.playerGames.delete(game.redPlayer);
          if (game.blackPlayer) this.playerGames.delete(game.blackPlayer);
          cleaned++;
          cleanedGameIds.push(gameId);
        }
      }
    }

    if (cleaned > 0) {
      gameLogger.info('Inactive games cleaned up', {
        count: cleaned,
        gameIds: cleanedGameIds,
        maxAgeMs,
      });
    }

    return cleaned;
  }

  /**
   * 从棋子数组创建 10x9 的棋盘数组。
   * 将空单元格初始化为 null，然后将棋子放在其位置上。
   * @param pieces - 带有位置数据的 Piece 对象数组
   * @returns 表示棋盘的 2D 数组 (Piece | null)[][]
   */
  private buildBoard(pieces: Piece[]): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(BOARD_ROWS)
      .fill(null)
      .map(() => Array(BOARD_COLS).fill(null));

    for (const piece of pieces) {
      board[piece.position.row][piece.position.col] = { ...piece };
    }

    return board;
  }

  makeAIMove(
    gameId: string,
    difficulty?: number
  ): { success: boolean; game?: GameState; error?: string } {
    const game = this.games.get(gameId);
    if (!game) {
      gameLogger.warn('makeAIMove failed - game not found', { gameId });
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== GameStatus.PLAYING) {
      gameLogger.warn('makeAIMove failed - game not in progress', { gameId, status: game.status });
      return { success: false, error: 'Game not in progress' };
    }

    const depth = difficulty !== undefined ? difficultyToDepth(difficulty) : (game.aiDifficulty !== undefined ? difficultyToDepth(game.aiDifficulty) : 4);
    const aiMove = this.aiEngine.findBestMove(game.board, game.currentTurn, depth);

    if (!aiMove) {
      // AI 无法找到有效移动，说明当前回合方被将死，判负方为当前回合（AI方），对方获胜
      game.status = GameStatus.FINISHED;
      const winner = game.currentTurn === Side.RED ? Side.BLACK : Side.RED;
      game.winner = winner;

      gameLogger.info('Game finished - no valid moves for AI', {
        gameId,
        currentTurn: game.currentTurn,
        winner,
        reason: 'checkmate',
        totalMoves: game.moves.length,
      });

      return { success: true, game };
    }

    return this.makeMove(gameId, 'ai-player', aiMove.from, aiMove.to);
  }

  /**
   * 返回当前内存中的所有游戏。
   * @returns 所有 GameState 对象的数组
   */
  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }
}
