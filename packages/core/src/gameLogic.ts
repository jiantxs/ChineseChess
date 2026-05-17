import { Piece, PieceType, Side, Position, BOARD_ROWS, BOARD_COLS } from './types';

/**
 * 中国象棋（Xiangqi）移动验证的纯函数。
 *
 * 此模块没有副作用——所有函数都将棋盘状态作为输入
 * 并根据 Xiangqi 规则返回计算结果。
 *
 * 棋盘坐标系统：row 0 = 黑方底线（上方），row 9 = 红方底线（下方）
 *
 * 用法：
 *   - isValidMove：验证给定棋子的移动是否合法
 *   - isGeneralCaptured：检查游戏是否结束（将帅是否被吃）
 *   - getValidMoves：获取棋子的所有合法目标位置
 *
 * @module gameLogic
 */

/**
 * 验证给定棋子在当前棋盘上的移动是否合法。
 * 检查棋盘边界、棋子碰撞和特定棋子类型的规则。
 *
 * @param board - (Piece | null) 的 2D 数组，表示当前棋盘状态
 * @param piece - 要移动的棋子，必须包含 type 和 side
 * @param from - 棋子的当前位置 {row, col}
 * @param to - 要移动到的目标位置 {row, col}
 * @returns 如果移动符合 Xiangqi 规则则返回 true，否则返回 false
 */
export function isValidMove(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position
): boolean {
  if (to.row < 0 || to.row >= BOARD_ROWS || to.col < 0 || to.col >= BOARD_COLS) {
    return false;
  }

  const targetPiece = board[to.row][to.col];
  if (targetPiece && targetPiece.side === piece.side) {
    return false;
  }

  switch (piece.type) {
    case PieceType.GENERAL:
      return isValidGeneralMove(board, piece, from, to);
    case PieceType.ADVISOR:
      return isValidAdvisorMove(piece, from, to);
    case PieceType.ELEPHANT:
      return isValidElephantMove(board, piece, from, to);
    case PieceType.HORSE:
      return isValidHorseMove(board, from, to);
    case PieceType.CHARIOT:
      return isValidChariotMove(board, from, to);
    case PieceType.CANNON:
      return isValidCannonMove(board, from, to);
    case PieceType.SOLDIER:
      return isValidSoldierMove(piece, from, to);
    default:
      return false;
  }
}

/**
 * 验证将帅（将/帅）的移动。
 * 将帅在九宫内水平或垂直移动一步（黑方：第 0-2 行，红方：第 7-9 行，第 3-5 列）。
 * 不能走出九宫或移动超过一步。
 * 不能以会使己方将帅直接受到攻击的方式移动（象棋中的违规）。
 *
 * @param board - 当前棋盘状态
 * @param piece - 将帅棋子
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果将帅的移动合法则返回 true
 */
function isValidGeneralMove(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position
): boolean {
  const isRed = piece.side === Side.RED;
  const palaceRowMin = isRed ? 7 : 0;
  const palaceRowMax = isRed ? 9 : 2;
  const palaceColMin = 3;
  const palaceColMax = 5;

  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  // 将帅面对面时可以互吃：如果目标位置是对方的将/帅，且中间无棋子，允许吃
  const targetPiece = board[to.row][to.col];
  if (targetPiece && targetPiece.type === PieceType.GENERAL) {
    if (from.col === to.col) {
      const minRow = Math.min(from.row, to.row);
      const maxRow = Math.max(from.row, to.row);
      let hasPieceBetween = false;
      for (let row = minRow + 1; row < maxRow; row++) {
        if (board[row][from.col] !== null) {
          hasPieceBetween = true;
          break;
        }
      }
      // 中间无棋子时，允许将吃将（面对面），跳过九宫格和只能走一格的限制
      if (!hasPieceBetween) {
        return true;
      }
    }
  }

  if (to.row < palaceRowMin || to.row > palaceRowMax || to.col < palaceColMin || to.col > palaceColMax) {
    return false;
  }

  if (rowDiff + colDiff !== 1) {
    return false;
  }

  return !wouldExposeGeneral(board, piece, from, to);
}

/**
 * 验证士（仕）的移动。
 * 士在九宫内对角线移动一步（与将帅相同的行/列边界）。
 * 九宫内每个士有5个位置形成 X 形。
 *
 * @param piece - 士棋子
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果士的移动合法则返回 true
 */
function isValidAdvisorMove(piece: Piece, from: Position, to: Position): boolean {
  const isRed = piece.side === Side.RED;
  const palaceRowMin = isRed ? 7 : 0;
  const palaceRowMax = isRed ? 9 : 2;
  const palaceColMin = 3;
  const palaceColMax = 5;

  if (to.row < palaceRowMin || to.row > palaceRowMax || to.col < palaceColMin || to.col > palaceColMax) {
    return false;
  }

  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  return rowDiff === 1 && colDiff === 1;
}

/**
 * 验证象（相）的移动。
 * 象先垂直移动2步再对角线移动1步，形成跳跃模式。
 * 不能过河：红象限制在第5-9行，黑象限制在第0-4行。
 * "眼"位置（中间垂直单元格）必须为空——不能被阻挡。
 * 代表 Xiangqi 中的士/卿职位。
 *
 * @param board - 当前棋盘状态
 * @param piece - 象棋子
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果象的移动合法则返回 true
 */
function isValidElephantMove(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position
): boolean {
  const isRed = piece.side === Side.RED;

  if (isRed && to.row < 5) return false;
  if (!isRed && to.row > 4) return false;

  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  if (rowDiff !== 2 || colDiff !== 2) {
    return false;
  }

  const eyeRow = (from.row + to.row) / 2;
  const eyeCol = (from.col + to.col) / 2;

  return board[eyeRow][eyeCol] === null;
}

/**
 * 验证马（馬）的移动。
 * 马先垂直移动1步再对角线移动1步，形成 L 形。
 * "腿"位置（马经过的垂直单元格）必须为空。
 * 与车炮不同，马可以跳跃。L 形可以是 2 行 + 1 列或 1 行 + 2 列。
 *
 * @param board - 当前棋盘状态
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果马的移动合法则返回 true
 */
function isValidHorseMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position
): boolean {
  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
    return false;
  }

  let legRow: number;
  let legCol: number;

  if (rowDiff === 2) {
    legRow = from.row + (to.row > from.row ? 1 : -1);
    legCol = from.col;
  } else {
    legRow = from.row;
    legCol = from.col + (to.col > from.col ? 1 : -1);
  }

  return board[legRow][legCol] === null;
}

/**
 * 验证车（車）的移动。
 * 车可以水平或垂直移动任意距离（像国际象棋中的车），但不能跳跃。
 * 从源位置到目标位置的路径必须完全畅通。
 * 可以吃对方的棋子，但在移动过程中必须落在它们上面。
 *
 * @param board - 当前棋盘状态
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果车的移动合法则返回 true
 */
function isValidChariotMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position
): boolean {
  if (from.row !== to.row && from.col !== to.col) {
    return false;
  }

  const stepRow = from.row === to.row ? 0 : (to.row > from.row ? 1 : -1);
  const stepCol = from.col === to.col ? 0 : (to.col > from.col ? 1 : -1);

  let currentRow = from.row + stepRow;
  let currentCol = from.col + stepCol;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol] !== null) {
      return false;
    }
    currentRow += stepRow;
    currentCol += stepCol;
  }

  return true;
}

/**
 * 验证炮（砲）的移动。
 * 炮像车一样水平或垂直移动，但吃子方式不同：
 * - 移动到空位：路径必须完全畅通（0 个垫子棋子）
 * - 吃对方棋子：起点和目标之间必须有恰好 1 个垫子（炮架）
 * 炮"跳"过棋子来吃，与不能跳的车不同。
 *
 * @param board - 当前棋盘状态
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果炮的移动合法则返回 true
 */
function isValidCannonMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position
): boolean {
  if (from.row !== to.row && from.col !== to.col) {
    return false;
  }

  const stepRow = from.row === to.row ? 0 : (to.row > from.row ? 1 : -1);
  const stepCol = from.col === to.col ? 0 : (to.col > from.col ? 1 : -1);

  let pieceCount = 0;
  let currentRow = from.row + stepRow;
  let currentCol = from.col + stepCol;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol] !== null) {
      pieceCount++;
    }
    currentRow += stepRow;
    currentCol += stepCol;
  }

  const targetPiece = board[to.row][to.col];

  if (targetPiece === null) {
    return pieceCount === 0;
  } else {
    return pieceCount === 1;
  }
}

/**
 * 验证兵（卒）的移动。
 * 过河前（红方：第 5-9 行，黑方：第 0-4 行）：只能前进一步。
 * 过河后（红方：第 0-4 行，黑方：第 5-9 行）：还可以横向移动一步。
 * 不能后退。红方向第 0 行移动（向上），黑方向第 9 行移动（向下）。
 *
 * @param piece - 带 side 信息的兵棋子
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果兵的移动合法则返回 true
 */
function isValidSoldierMove(
  piece: Piece,
  from: Position,
  to: Position
): boolean {
  const isRed = piece.side === Side.RED;
  const rowDiff = to.row - from.row;
  const colDiff = Math.abs(to.col - from.col);

  if (colDiff > 1) return false;
  if (colDiff === 1 && rowDiff !== 0) return false;

  const hasCrossedRiver = isRed ? from.row <= 4 : from.row >= 5;

  if (!hasCrossedRiver) {
    if (colDiff === 1) return false;
    return isRed ? rowDiff === -1 : rowDiff === 1;
  }

  if (colDiff === 1) {
    return rowDiff === 0;
  }

  return isRed ? rowDiff === -1 : rowDiff === 1;
}

/**
 * 模拟移动并检查是否会使移动方的将帅直接受到攻击。
 * 在 Xiangqi 中，将帅在空旷的直线上面对面是违规的（禁止的将军）。
 * 此函数克隆棋盘，执行移动，然后检查移动的将帅是否被将军。
 *
 * @param board - 当前棋盘状态
 * @param piece - 被移动的棋子
 * @param from - 当前位置
 * @param to - 目标位置
 * @returns 如果移动会使己方将帅受到攻击则返回 true（违规移动）
 */
function wouldExposeGeneral(
  board: (Piece | null)[][],
  piece: Piece,
  from: Position,
  to: Position
): boolean {
  const tempBoard = board.map(row => [...row]);
  tempBoard[to.row][to.col] = piece;
  tempBoard[from.row][from.col] = null;

  let redGeneralPos: Position | null = null;
  let blackGeneralPos: Position | null = null;

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const p = tempBoard[row][col];
      if (p?.type === PieceType.GENERAL) {
        if (p.side === Side.RED) redGeneralPos = { row, col };
        else blackGeneralPos = { row, col };
      }
    }
  }

  if (!redGeneralPos || !blackGeneralPos) return false;
  if (redGeneralPos.col !== blackGeneralPos.col) return false;

  const minRow = Math.min(redGeneralPos.row, blackGeneralPos.row);
  const maxRow = Math.max(redGeneralPos.row, blackGeneralPos.row);

  for (let row = minRow + 1; row < maxRow; row++) {
    if (tempBoard[row][redGeneralPos.col] !== null) {
      return false;
    }
  }

  return true;
}

/**
 * 检查任一将帅是否被吃，确定游戏结束条件。
 * 在 Xiangqi 中，吃掉对方的将帅会立即结束游戏。
 *
 * @param board - 作为 (Piece | null) 2D 数组的当前棋盘状态
 * @returns 如果将帅缺失则 captured 为 true，winner 是存活的一方
 */
export function isGeneralCaptured(board: (Piece | null)[][]): { captured: boolean; winner?: Side } {
  let redGeneral = false;
  let blackGeneral = false;

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece?.type === PieceType.GENERAL) {
        if (piece.side === Side.RED) redGeneral = true;
        else blackGeneral = true;
      }
    }
  }

  if (!redGeneral) return { captured: true, winner: Side.BLACK };
  if (!blackGeneral) return { captured: true, winner: Side.RED };
  return { captured: false };
}

/**
 * 返回给定棋子在当前棋盘上的所有合法目标位置。
 * 扫描所有 90 个棋盘位置，只返回通过 isValidMove 验证的位置。
 *
 * @param board - 作为 (Piece | null) 2D 数组的当前棋盘状态
 * @param piece - 要获取合法移动的棋子，必须包含 position
 * @returns 棋子可以移动到的合法 {row, col} 位置数组
 */
export function getValidMoves(
  board: (Piece | null)[][],
  piece: Piece
): Position[] {
  const moves: Position[] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (isValidMove(board, piece, piece.position, { row, col })) {
        moves.push({ row, col });
      }
    }
  }

  return moves;
}
