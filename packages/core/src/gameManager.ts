import { v4 as uuidv4 } from 'uuid';
import type { GameState, Piece, Move, Position } from './types';
import { GameStatus, Side, INITIAL_BOARD, BOARD_ROWS, BOARD_COLS } from './types';
import { isValidMove, isGeneralCaptured } from './gameLogic';

export class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerGames: Map<string, string> = new Map();

  createGame(): GameState {
    const gameId = uuidv4();
    const board = this.createInitialBoard();

    const game: GameState = {
      id: gameId,
      board,
      currentTurn: Side.RED,
      moves: [],
      status: GameStatus.WAITING,
      lastMoveTime: Date.now(),
      createdAt: Date.now(),
    };

    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  joinGame(gameId: string, playerId: string, side?: Side): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    if (game.status !== GameStatus.WAITING) {
      return null;
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
    const expectedPlayer = isRedTurn ? game.redPlayer : game.blackPlayer;

    if (expectedPlayer !== playerId) {
      return { success: false, error: 'Not your turn' };
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

    const generalStatus = isGeneralCaptured(game.board);
    if (generalStatus.captured) {
      game.status = GameStatus.FINISHED;
      game.winner = generalStatus.winner;
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

  private createInitialBoard(): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(BOARD_ROWS)
      .fill(null)
      .map(() => Array(BOARD_COLS).fill(null));

    for (const piece of INITIAL_BOARD) {
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
