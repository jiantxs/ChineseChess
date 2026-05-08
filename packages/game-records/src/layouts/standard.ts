/**
 * Standard Xiangqi initial board setup.
 *
 * Contains 32 pieces: 16 red (r1-r16) and 16 black (b1-b16).
 * Board orientation: row 0 = black home (bottom), row 9 = red home (top).
 */
import { PieceLayout, PieceType, Side } from '@chess/core';

/**
 * Serialized layout data for the standard Xiangqi setup.
 *
 * Structure:
 * - `name`: Layout identifier ("standard")
 * - `description`: Human-readable description
 * - `firstPlayer`: Which side moves first (Side.RED)
 * - `pieces`: Array of piece definitions with id, type, side, position
 */
export const standardLayoutData = {
  name: 'standard',
  description: 'Standard Xiangqi initial setup',
  firstPlayer: Side.RED,
  pieces: [
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
  ],
};

/**
 * PieceLayout instance representing the standard Xiangqi initial board setup.
 * Created from standardLayoutData via PieceLayout.fromJSON().
 */
export const standardLayout = PieceLayout.fromJSON(standardLayoutData);
