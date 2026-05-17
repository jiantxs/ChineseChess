/**
 * Core type definitions re-exported from @chess/types
 * plus game-logic-specific types for Chinese Chess (Xiangqi).
 *
 * @module types
 */

// Re-export type-only exports (interfaces, type aliases)
export type {
  Position,
  Piece,
  Move,
  GameState,
  GameMessage,
} from '@chess/types';

// Re-export enums and constants (used as both types and values)
export {
  PieceType,
  Side,
  GameStatus,
  MessageType,
  BOARD_ROWS,
  BOARD_COLS,
} from '@chess/types';

// Import types and enums needed for INITIAL_BOARD constant
import type { Piece } from '@chess/types';
import { PieceType, Side } from '@chess/types';

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