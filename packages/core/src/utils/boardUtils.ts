import { BOARD_ROWS, BOARD_COLS } from '../types';
import type { Piece } from '../types';

/**
 * 从棋子数组构建 10x9 的棋盘数组。
 * 将空单元格初始化为 null，然后将棋子放在其位置上。
 * @param pieces - 带有位置数据的 Piece 对象数组
 * @returns 表示棋盘的 2D 数组 (Piece | null)[][]
 */
export function buildBoard(pieces: Piece[]): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(BOARD_ROWS)
    .fill(null)
    .map(() => Array(BOARD_COLS).fill(null));

  for (const piece of pieces) {
    board[piece.position.row][piece.position.col] = { ...piece };
  }

  return board;
}