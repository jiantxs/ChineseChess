"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_BOARD = exports.BOARD_COLS = exports.BOARD_ROWS = exports.MessageType = exports.GameStatus = exports.Side = exports.PieceType = void 0;
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
var PieceType;
(function (PieceType) {
    PieceType["GENERAL"] = "general";
    PieceType["ADVISOR"] = "advisor";
    PieceType["ELEPHANT"] = "elephant";
    PieceType["HORSE"] = "horse";
    PieceType["CHARIOT"] = "chariot";
    PieceType["CANNON"] = "cannon";
    PieceType["SOLDIER"] = "soldier";
})(PieceType || (exports.PieceType = PieceType = {}));
/**
 * Represents the two opposing sides in Chinese Chess.
 * - RED (红): Moves first, starts from row 9 (bottom of board)
 * - BLACK (黑): Moves second, starts from row 0 (top of board)
 */
var Side;
(function (Side) {
    Side["RED"] = "red";
    Side["BLACK"] = "black";
})(Side || (exports.Side = Side = {}));
/**
 * Represents the current status of a game session.
 * - WAITING: Game created, waiting for second player to join
 * - PLAYING: Both players connected, game in progress
 * - FINISHED: Game ended with winner or draw
 * - ABORTED: Game terminated due to player disconnect or timeout
 */
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "waiting";
    GameStatus["PLAYING"] = "playing";
    GameStatus["FINISHED"] = "finished";
    GameStatus["ABORTED"] = "aborted";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
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
var MessageType;
(function (MessageType) {
    MessageType["JOIN_GAME"] = "join_game";
    MessageType["LEAVE_GAME"] = "leave_game";
    MessageType["MAKE_MOVE"] = "make_move";
    MessageType["GAME_STATE"] = "game_state";
    MessageType["PLAYER_DISCONNECTED"] = "player_disconnected";
    MessageType["PLAYER_RECONNECTED"] = "player_reconnected";
    MessageType["GAME_OVER"] = "game_over";
    MessageType["ERROR"] = "error";
    MessageType["PING"] = "ping";
    MessageType["PONG"] = "pong";
    MessageType["AI_MOVE"] = "ai_move";
    MessageType["GET_VALID_MOVES"] = "get_valid_moves";
    MessageType["VALID_MOVES"] = "valid_moves";
})(MessageType || (exports.MessageType = MessageType = {}));
/** Board dimensions: 10 rows (0-9) and 9 columns (0-8) */
exports.BOARD_ROWS = 10;
exports.BOARD_COLS = 9;
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
exports.INITIAL_BOARD = [
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
//# sourceMappingURL=types.js.map