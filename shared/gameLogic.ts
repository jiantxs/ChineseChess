import { Piece, PieceType, Side, Position, BOARD_ROWS, BOARD_COLS } from './types';

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

  if (to.row < palaceRowMin || to.row > palaceRowMax || to.col < palaceColMin || to.col > palaceColMax) {
    return false;
  }

  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  if (rowDiff + colDiff !== 1) {
    return false;
  }

  return !wouldExposeGeneral(board, piece, from, to);
}

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
