/**
 * Board adapter for converting between project board representation
 * and AI engine internal representation.
 */

import { Piece, Position, PieceType, Side } from '../types';

/**
 * Board dimensions in the project representation.
 */
const BOARD_ROWS = 10;
const BOARD_COLS = 9;

/**
 * Convert PieceType to numeric value for AI engine encoding.
 */
const PIECE_TYPE_TO_NUM: Record<PieceType, number> = {
  [PieceType.GENERAL]: 0,
  [PieceType.ADVISOR]: 1,
  [PieceType.ELEPHANT]: 2,
  [PieceType.HORSE]: 3,
  [PieceType.CHARIOT]: 4,
  [PieceType.CANNON]: 5,
  [PieceType.SOLDIER]: 6,
};

export function boardToSquares(board: (Piece | null)[][]): number[] {
  const squares: number[] = new Array(256).fill(0);

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece === null) continue;

      const y = row + 3;
      const x = col + 3;
      const sq = (y << 4) | x;

      const pieceNum = PIECE_TYPE_TO_NUM[piece.type];
      const encoding = piece.side === Side.RED ? 8 + pieceNum : 16 + pieceNum;
      squares[sq] = encoding;
    }
  }

  return squares;
}

export function squaresToBoard(squares: number[]): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: BOARD_ROWS }, () =>
    Array(BOARD_COLS).fill(null)
  );

  const NUM_TO_PIECE_TYPE: PieceType[] = [
    PieceType.GENERAL,
    PieceType.ADVISOR,
    PieceType.ELEPHANT,
    PieceType.HORSE,
    PieceType.CHARIOT,
    PieceType.CANNON,
    PieceType.SOLDIER,
  ];

  for (let sq = 0; sq < squares.length; sq++) {
    const pc = squares[sq];
    if (pc === 0) continue;

    const y = sq >> 4;
    const x = sq & 0xF;

    const row = y - 3;
    const col = x - 3;
    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) continue;

    const typeNum = pc & 7;
    const type = NUM_TO_PIECE_TYPE[typeNum];
    const side = (pc & 8) !== 0 ? Side.RED : Side.BLACK;

    board[row][col] = {
      id: `${side === Side.RED ? 'r' : 'b'}${typeNum}`,
      type,
      side,
      position: { row, col },
    };
  }

  return board;
}

export function positionToSq(pos: Position): number {
  const y = pos.row + 3;
  const x = pos.col + 3;
  return (y << 4) | x;
}

export function sqToPosition(sq: number): Position {
  const y = sq >> 4;
  const x = sq & 0xF;
  return { row: y - 3, col: x - 3 };
}

export function makeMove(sqSrc: number, sqDst: number): number {
  return sqSrc | (sqDst << 8);
}

export function moveSrc(mv: number): number {
  return mv & 0xFF;
}

export function moveDst(mv: number): number {
  return (mv >> 8) & 0xFF;
}