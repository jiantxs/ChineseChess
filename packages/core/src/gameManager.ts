import { v4 as uuidv4 } from 'uuid';
import type { GameState, Piece, Move, Position } from './types';
import { GameStatus, Side, BOARD_ROWS, BOARD_COLS } from './types';
import { isValidMove, isGeneralCaptured, getValidMoves as getValidMovesLogic } from './gameLogic';
import { PieceLayout } from './pieceLayout';
import { gameLogger } from './gameLogger';

/**
 * GameManager - Singleton for in-memory Chinese Chess game state management.
 *
 * This module provides the GameManager singleton for managing all game state in memory.
 * It maintains:
 * - `games`: Map<gameId, GameState> - all active and finished games
 * - `playerGames`: Map<playerId, gameId> - player to game mapping
 *
 * Usage:
 *   import { gameManager } from '@chess/core';
 *   const game = gameManager.createGame(layout);
 *
 * IMPORTANT: The cleanupInactiveGames method must be called externally
 * (e.g., by a scheduled job or the WebSocket server) to periodically
 * remove finished/aborted games from memory.
 *
 * @module GameManager
 */
export class GameManager {
  /**
   * Singleton GameManager for managing all game state in memory.
   * Uses a private static instance field to ensure only one instance exists.
   * The constructor is private to prevent direct instantiation - use getInstance() instead.
   */
  private static instance: GameManager;
  private games: Map<string, GameState> = new Map();
  private playerGames: Map<string, string> = new Map();

  private constructor() {}

  /**
   * Returns the singleton GameManager instance.
   * Creates a new instance if one does not already exist.
   * @returns The singleton GameManager instance
   */
  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * Creates a new game with the given layout and optional local mode.
   * Finishes any games still in PLAYING or WAITING status before creating.
   * @param layout - PieceLayout instance defining initial board setup
   * @param local - If true, game is hot-seat mode (both sides same player)
   * @returns Newly created GameState
   */
  createGame(layout: PieceLayout, local: boolean = false): GameState {
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
    };

    this.games.set(gameId, game);

    gameLogger.info('Game created', {
      gameId,
      layout: layout.getName(),
      firstPlayer: layout.getFirstPlayer(),
      local,
      initialBoard: board.map(row => row.map(p => p ? { id: p.id, type: p.type, side: p.side, position: p.position } : null)),
    });

    return game;
  }

  /**
   * Retrieves a game by its unique identifier.
   * @param gameId - UUID of the game to retrieve
   * @returns GameState if found, undefined otherwise
   */
  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  /**
   * Adds a player to an existing game or creates a local game.
   * For local games, both sides are assigned to the same player.
   * For online games, player joins the specified side or an available side.
   * @param gameId - Game to join
   * @param playerId - Player's unique identifier
   * @param side - Optional specific side (RED/BLACK) to join
   * @returns Updated GameState if join succeeds, null otherwise
   */
  joinGame(gameId: string, playerId: string, side?: Side): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      gameLogger.warn('joinGame failed - game not found', { gameId, playerId, side });
      return null;
    }

    if (game.status !== GameStatus.WAITING && !game.localGame) {
      gameLogger.warn('joinGame failed - game not waiting', { gameId, playerId, side, status: game.status });
      return null;
    }

    // For local games, assign both sides to the same playerId
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
   * Executes a move in the specified game.
   * Validates turn order, piece ownership, and move legality before applying.
   * Updates the board, records the move, switches turn, and checks win condition.
   * @param gameId - Game to make move in
   * @param playerId - Player making the move
   * @param from - Source position {row, col}
   * @param to - Destination position {row, col}
   * @returns Object with success flag, updated game if successful, or error message
   */
  makeMove(
    gameId: string,
    playerId: string,
    from: Position,
    to: Position
  ): { success: boolean; game?: GameState; error?: string } {
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

    return { success: true, game };
  }

  /**
   * Removes a player from the game.
   * For games in progress, this forfeits the game for the leaving player.
   * If both players leave, the game is deleted.
   * @param gameId - Game to leave
   * @param playerId - Player leaving the game
   * @returns Updated GameState if game continues, null if game deleted
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
   * Finds the game a player is currently in.
   * @param playerId - Player's unique identifier
   * @returns GameState if player is in a game, undefined otherwise
   */
  getPlayerGame(playerId: string): GameState | undefined {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  /**
   * Gets all valid destination positions for the piece at the given position.
   * Validates that it is the player's turn (for online games).
   * @param gameId - Game to query
   * @param playerId - Player requesting valid moves (validates turn)
   * @param position - {row, col} of piece to get moves for
   * @returns Array of valid destination positions
   */
  getValidMoves(gameId: string, playerId: string, position: Position): Position[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    const piece = game.board[position.row][position.col];
    if (!piece) return [];

    // For local games, both players can control any piece
    // For online games, only the player whose turn it is can move
    if (!game.localGame) {
      const isRedTurn = game.currentTurn === Side.RED;
      const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
      if (expectedPlayer !== playerId) return [];
    }

    if (piece.side !== game.currentTurn) return [];

return getValidMovesLogic(game.board, piece);
  }

  /**
   * Removes finished or aborted games older than the specified max age.
   * @param maxAgeMs - Maximum age in milliseconds (e.g., 3600000 for 1 hour)
   * @returns Number of games cleaned up
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
   * Creates a 10x9 board array from a pieces array.
   * Initializes empty cells as null, then places pieces at their positions.
   * @param pieces - Array of Piece objects with position data
   * @returns 2D array (Piece | null)[][] representing the board
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

  /**
   * Returns all games currently in memory.
   * @returns Array of all GameState objects
   */
  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }
}

export const gameManager = GameManager.getInstance();
