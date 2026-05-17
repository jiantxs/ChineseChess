/**
 * Shared type definitions for Chinese Chess (Xiangqi).
 *
 * This package contains all type definitions used by both frontend and backend:
 * - Game logic: piece types, sides, positions, moves
 * - State management: game state, player turns, move history
 * - WebSocket communication: client-server message types
 *
 * @module @chess/types
 */

/**
 * Types of chess pieces in Chinese Chess (Xiangqi).
 * Each type has specific movement rules:
 * - GENERAL (将/帥): Moves one point horizontally or vertically within the palace
 * - ADVISOR (士/仕): Moves one point diagonally within the palace
 * - ELEPHANT (象/相): Moves two points diagonally, cannot cross the river
 * - HORSE (馬/傌): Moves one point orthogonally then one point diagonally (horse leg)
 * - CHARIOT (車/俥): Moves any number of points horizontally or vertically
 * - CANNON (炮/砲): Moves like chariot but must jump exactly one piece to capture
 * - SOLDIER (兵/卒): Moves forward one point before river, forward or sideways after
 */
export enum PieceType {
  GENERAL = 'general',
  ADVISOR = 'advisor',
  ELEPHANT = 'elephant',
  HORSE = 'horse',
  CHARIOT = 'chariot',
  CANNON = 'cannon',
  SOLDIER = 'soldier',
}

/**
 * Represents the two opposing sides in Chinese Chess.
 * - RED (红): Moves first, starts from row 9 (bottom of board)
 * - BLACK (黑): Moves second, starts from row 0 (top of board)
 */
export enum Side {
  RED = 'red',
  BLACK = 'black',
}

/**
 * Represents a position on the Chinese Chess board.
 * Uses {row, col} coordinate system where:
 * - row: 0-9 (0 = black's home row, 9 = red's home row)
 * - col: 0-8 (0 = left edge, 8 = right edge)
 * Note: This is NOT {x, y} - row increases downward for RED's perspective
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * Represents a single chess piece on the board.
 * Each piece has a unique id, type determining movement rules,
 * side determining player ownership, and current position.
 */
export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  position: Position;
}

/**
 * Represents a move action in the game.
 * Contains the source and destination positions, the piece being moved,
 * and optionally the captured piece if the move is a capture.
 */
export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
}

/**
 * Represents the current status of a game session.
 * - WAITING: Game created, waiting for second player to join
 * - PLAYING: Both players connected, game in progress
 * - FINISHED: Game ended with winner or draw
 * - ABORTED: Game terminated due to player disconnect or timeout
 */
export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
  ABORTED = 'aborted',
}

/**
 * Represents the complete state of a Chinese Chess game.
 * Contains the board layout, current turn, move history, game status,
 * player information, and timestamps for tracking.
 */
export interface GameState {
  id: string;
  board: (Piece | null)[][];
  currentTurn: Side;
  moves: Move[];
  status: GameStatus;
  winner?: Side;
  redPlayer?: string;
  blackPlayer?: string;
  lastMoveTime: number;
  createdAt: number;
  localGame?: boolean;
}

/**
 * WebSocket message types for client-server communication.
 * - JOIN_GAME: Player joins a game session
 * - LEAVE_GAME: Player voluntarily leaves
 * - MAKE_MOVE: Player sends a move action
 * - GAME_STATE: Server broadcasts current board state
 * - PLAYER_DISCONNECTED/RECONNECTED: Connection status events
 * - GAME_OVER: Game ended with winner announcement
 * - ERROR: Error message (invalid move, etc.)
 * - PING/PONG: Connection keepalive messages
 * - AI_MOVE: AI opponent makes a move
 * - GET_VALID_MOVES/VALID_MOVES: Query valid moves for a piece
 */
export enum MessageType {
  JOIN_GAME = 'join_game',
  LEAVE_GAME = 'leave_game',
  MAKE_MOVE = 'make_move',
  GAME_STATE = 'game_state',
  PLAYER_DISCONNECTED = 'player_disconnected',
  PLAYER_RECONNECTED = 'player_reconnected',
  GAME_OVER = 'game_over',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  AI_MOVE = 'ai_move',
  GET_VALID_MOVES = 'get_valid_moves',
  VALID_MOVES = 'valid_moves',
}

/**
 * Represents a WebSocket message between server and client.
 * Used for all real-time game communication including moves,
 * game state updates, and connection management.
 */
export interface GameMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  gameId: string;
}

/** Board dimensions: 10 rows (0-9) and 9 columns (0-8) */
export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;