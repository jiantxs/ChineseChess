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
export const soilderLayoutData = {
  name: 'soider',
  description: '兵残棋1',
  firstPlayer: Side.RED,
  pieces: [
    { id: 'r1', type: PieceType.GENERAL, side: Side.RED, position: { row: 9, col: 4 } },
    { id: 'r2', type: PieceType.SOLDIER, side: Side.RED, position: { row: 2, col: 4 } },



    { id: 'b5', type: PieceType.GENERAL, side: Side.BLACK, position: { row: 0, col: 4 } }
  ],
};

/**
 * PieceLayout instance representing the standard Xiangqi initial board setup.
 * Created from standardLayoutData via PieceLayout.fromJSON().
 */
export const soldierLayout = PieceLayout.fromJSON(soilderLayoutData);
