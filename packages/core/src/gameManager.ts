import { v4 as uuidv4 } from 'uuid';
import type { GameState, Piece, Move, Position } from './types';
import { GameStatus, Side, BOARD_ROWS, BOARD_COLS } from './types';
import { isValidMove, isGeneralCaptured, getValidMoves as getValidMovesLogic } from './gameLogic';
import { PieceLayout } from './pieceLayout';
import { gameLogger } from './gameLogger';

export class GameManager {
  private static instance: GameManager;
  private games: Map<string, GameState> = new Map();
  private playerGames: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

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

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  joinGame(gameId: string, playerId: string, side?: Side): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    if (game.status !== GameStatus.WAITING && !game.localGame) {
      return null;
    }

    // For local games, assign both sides to the same playerId
    if (game.localGame) {
      game.redPlayer = playerId;
      game.blackPlayer = playerId;
      this.playerGames.set(playerId, gameId);
      game.status = GameStatus.PLAYING;
      return game;
    }

    if (side === Side.RED && game.redPlayer) {
      return null;
    }
    if (side === Side.BLACK && game.blackPlayer) {
      return null;
    }

    if (!side) {
      if (!game.redPlayer) side = Side.RED;
      else if (!game.blackPlayer) side = Side.BLACK;
      else return null;
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

    return game;
  }

  makeMove(
    gameId: string,
    playerId: string,
    from: Position,
    to: Position
  ): { success: boolean; game?: GameState; error?: string } {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== GameStatus.PLAYING) {
      return { success: false, error: 'Game is not in progress' };
    }

    const isRedTurn = game.currentTurn === Side.RED;

    if (!game.localGame) {
      const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;
      if (expectedPlayer !== playerId) {
        return { success: false, error: 'Not your turn' };
      }
    }

    const piece = game.board[from.row][from.col];
    if (!piece) {
      return { success: false, error: 'No piece at source position' };
    }

    if (piece.side !== game.currentTurn) {
      return { success: false, error: 'Cannot move opponent piece' };
    }

    if (!isValidMove(game.board, piece, from, to)) {
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

  leaveGame(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const wasRedPlayer = game.redPlayer === playerId;
    if (wasRedPlayer) {
      game.redPlayer = undefined;
    } else if (game.blackPlayer === playerId) {
      game.blackPlayer = undefined;
    }

    this.playerGames.delete(playerId);

    if (game.status === GameStatus.PLAYING) {
      game.status = GameStatus.ABORTED;
      game.winner = wasRedPlayer ? Side.BLACK : Side.RED;

      gameLogger.info('Game aborted', {
        gameId,
        playerId,
        winner: game.winner,
        reason: 'player_left',
      });
    }

    if (!game.redPlayer && !game.blackPlayer) {
      this.games.delete(gameId);
      return null;
    }

    return game;
  }

  getPlayerGame(playerId: string): GameState | undefined {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

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

  private buildBoard(pieces: Piece[]): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(BOARD_ROWS)
      .fill(null)
      .map(() => Array(BOARD_COLS).fill(null));

    for (const piece of pieces) {
      board[piece.position.row][piece.position.col] = { ...piece };
    }

    return board;
  }

  cleanupInactiveGames(maxAgeMs: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [gameId, game] of this.games.entries()) {
      if (game.status === GameStatus.FINISHED || game.status === GameStatus.ABORTED) {
        if (now - game.lastMoveTime > maxAgeMs) {
          this.games.delete(gameId);
          if (game.redPlayer) this.playerGames.delete(game.redPlayer);
          if (game.blackPlayer) this.playerGames.delete(game.blackPlayer);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }
}

export const gameManager = GameManager.getInstance();
