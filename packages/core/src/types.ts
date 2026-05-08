/**
 * Core type definitions for Chinese Chess (Xiangqi)
 *
 * This module contains all type definitions used throughout the application:
 * - Game logic: piece movement, validation, board state
 * - State management: game state, player turns, move history
 * - WebSocket communication: client-server message types
 *
 * @module types
 *
 * @related
 * - {@link ./gameLogic.ts} - Uses PieceType, Side, Position, Move for move validation
 * - {@link ./gameManager.ts} - Manages GameState instances, player-game mapping
 * - {@link ./pieceLayout.ts} - Creates Piece instances for board initialization
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

/** Board dimensions: 10 rows (0-9) and 9 columns (0-8) */
export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

/**
 * Standard Xiangqi starting position with 32 pieces.
 * - RED pieces (r1-r16): Rows 6-9, chariots/horses/elephants/advisors/general on back rank, cannons at row 7, soldiers at row 6
 * - BLACK pieces (b1-b16): Rows 0-3, symmetric setup mirrored vertically
 *
 * Board layout (black at top row 0, red at bottom row 9):
 * Row 0: b1 chariot, b2 horse, b3 elephant, b4 advisor, b5 general, b6 advisor, b7 elephant, b8 horse, b9 chariot
 * Row 2: b10 cannon at col 1, b11 cannon at col 7
 * Row 3: b12-b16 soldiers at cols 0,2,4,6,8
 * Row 6: r12-r16 soldiers at cols 0,2,4,6,8
 * Row 7: r10 cannon at col 1, r11 cannon at col 7
 * Row 9: r1 chariot, r2 horse, r3 elephant, r4 advisor, r5 general, r6 advisor, r7 elephant, r8 horse, r9 chariot
 */
export const INITIAL_BOARD: Piece[] = [
  { id: 'r1', type: PieceType.CHARIOT, side: Side.RED, position: { row: 9, col: 0 } },
  { id: 'r2', type: PieceType.HORSE, side: Side.RED, position: { row: 9, col: 1 } },
  { id: 'r3', type: PieceType.ELEPHANT, side: Side.RED, position: { row: 9, col: 2 } },
  { id: 'r4', type: PieceType.ADVISOR, side: Side.RED, position: { row: 9, col: 3 } },
  { id: 'r5', type: PieceType.GENERAL, side: Side.RED, position: { row: 9, col: 4 } },
  { id: 'r6', type: PieceType.ADVISOR, side: Side.RED, position: { row: 9, col: 5 } },
  { id: 'r7', type: PieceType.ELEPHANT, side: Side.RED, position: { row: 9, col: 6 } },
  { id: 'r8', type: PieceType.HORSE, side: Side.RED, position: { row: 9, col: 7 } },
  { id: 'r9', type: PieceType.CHARIOT, side: Side.RED, position: { row: 9, col: 8 } },
  { id: 'r10', type: PieceType.CANNON, side: Side.RED, position: { row: 7, col: 1 } },
  { id: 'r11', type: PieceType.CANNON, side: Side.RED, position: { row: 7, col: 7 } },
  { id: 'r12', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 0 } },
  { id: 'r13', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 2 } },
  { id: 'r14', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 4 } },
  { id: 'r15', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 6 } },
  { id: 'r16', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 8 } },

  { id: 'b1', type: PieceType.CHARIOT, side: Side.BLACK, position: { row: 0, col: 0 } },
  { id: 'b2', type: PieceType.HORSE, side: Side.BLACK, position: { row: 0, col: 1 } },
  { id: 'b3', type: PieceType.ELEPHANT, side: Side.BLACK, position: { row: 0, col: 2 } },
  { id: 'b4', type: PieceType.ADVISOR, side: Side.BLACK, position: { row: 0, col: 3 } },
  { id: 'b5', type: PieceType.GENERAL, side: Side.BLACK, position: { row: 0, col: 4 } },
  { id: 'b6', type: PieceType.ADVISOR, side: Side.BLACK, position: { row: 0, col: 5 } },
  { id: 'b7', type: PieceType.ELEPHANT, side: Side.BLACK, position: { row: 0, col: 6 } },
  { id: 'b8', type: PieceType.HORSE, side: Side.BLACK, position: { row: 0, col: 7 } },
  { id: 'b9', type: PieceType.CHARIOT, side: Side.BLACK, position: { row: 0, col: 8 } },
  { id: 'b10', type: PieceType.CANNON, side: Side.BLACK, position: { row: 2, col: 1 } },
  { id: 'b11', type: PieceType.CANNON, side: Side.BLACK, position: { row: 2, col: 7 } },
  { id: 'b12', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 0 } },
  { id: 'b13', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 2 } },
  { id: 'b14', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 4 } },
  { id: 'b15', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 6 } },
  { id: 'b16', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 8 } },
];
