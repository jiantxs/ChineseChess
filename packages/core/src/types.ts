/**
 * 从 @chess/types 重新导出的核心类型定义
 * 以及中国象棋（Xiangqi）的游戏逻辑特定类型。
 *
 * @module types
 */

// 重新导出仅类型导出（接口、类型别名）
export type {
  Position,
  Piece,
  Move,
  GameState,
  GameMessage,
} from '@chess/types';

// 重新导出枚举和常量（用作类型和值）
export {
  PieceType,
  Side,
  GameStatus,
  MessageType,
  BOARD_ROWS,
  BOARD_COLS,
} from '@chess/types';

// 导入用于 INITIAL_BOARD 常量的类型和枚举
import type { Piece } from '@chess/types';
import { PieceType, Side } from '@chess/types';

/**
 * 标准象棋开局位置，包含32个棋子。
 * - 红方棋子（r1-r16）：第6-9行，车马象士帅在后排，第7行是炮，第6行是兵
 * - 黑方棋子（b1-b16）：第0-3行，与红方呈垂直对称布局
 *
 * 棋盘布局（黑方在上方第0行，红方在下方第9行）：
 * 第0行：b1 车，b2 马，b3 象，b4 士，b5 帅，b6 士，b7 象，b8 马，b9 车
 * 第2行：b10 炮在第1列，b11 炮在第7列
 * 第3行：b12-b16 兵在第0,2,4,6,8列
 * 第6行：r12-r16 兵在第0,2,4,6,8列
 * 第7行：r10 炮在第1列，r11 炮在第7列
 * 第9行：r1 车，r2 马，r3 象，r4 士，r5 帅，r6 士，r7 象，r8 马，r9 车
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