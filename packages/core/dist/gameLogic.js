"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidMove = isValidMove;
exports.isGeneralCaptured = isGeneralCaptured;
exports.getValidMoves = getValidMoves;
const types_1 = require("./types");
/**
 * Pure functions for Chinese Chess (Xiangqi) move validation.
 *
 * This module contains no side effects - all functions take board state as input
 * and return computed results based on Xiangqi rules.
 *
 * Board coordinate system: row 0 = black home (top), row 9 = red home (bottom)
 *
 * Usage:
 *   - isValidMove: validate if a move is legal for a given piece
 *   - isGeneralCaptured: check if game is over (a general was captured)
 *   - getValidMoves: get all valid destinations for a piece
 *
 * @module gameLogic
 */
/**
 * Validates if a move is legal for a given piece on the current board.
 * Checks board boundaries, piece collisions, and piece-type-specific rules.
 *
 * @param board - 2D array of (Piece | null), representing the current board state
 * @param piece - The piece to move, must include type and side
 * @param from - Current position {row, col} of the piece
 * @param to - Target position {row, col} to move to
 * @returns true if the move is valid according to Xiangqi rules, false otherwise
 */
function isValidMove(board, piece, from, to) {
    if (to.row < 0 || to.row >= types_1.BOARD_ROWS || to.col < 0 || to.col >= types_1.BOARD_COLS) {
        return false;
    }
    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.side === piece.side) {
        return false;
    }
    switch (piece.type) {
        case types_1.PieceType.GENERAL:
            return isValidGeneralMove(board, piece, from, to);
        case types_1.PieceType.ADVISOR:
            return isValidAdvisorMove(piece, from, to);
        case types_1.PieceType.ELEPHANT:
            return isValidElephantMove(board, piece, from, to);
        case types_1.PieceType.HORSE:
            return isValidHorseMove(board, from, to);
        case types_1.PieceType.CHARIOT:
            return isValidChariotMove(board, from, to);
        case types_1.PieceType.CANNON:
            return isValidCannonMove(board, from, to);
        case types_1.PieceType.SOLDIER:
            return isValidSoldierMove(piece, from, to);
        default:
            return false;
    }
}
/**
 * Validates a General (将/帅) move.
 * General moves 1 step orthogonally within the palace (rows 0-2 for black, rows 7-9 for red, cols 3-5).
 * Cannot move out of palace or move more than 1 step.
 * Cannot move in a way that would expose own general to direct attack (illegal in Xiangqi).
 *
 * @param board - Current board state
 * @param piece - The general piece
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for a General
 */
function isValidGeneralMove(board, piece, from, to) {
    const isRed = piece.side === types_1.Side.RED;
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
/**
 * Validates an Advisor (士) move.
 * Advisor moves 1 step diagonally within the palace (same row/col boundaries as General).
 * There are 5 advisor positions in each palace forming an X pattern.
 *
 * @param piece - The advisor piece
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for an Advisor
 */
function isValidAdvisorMove(piece, from, to) {
    const isRed = piece.side === types_1.Side.RED;
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
 * Validates an Elephant (象/相) move.
 * Elephant moves 2 steps orthogonally then 1 step diagonally, forming a jump pattern.
 * Cannot cross the river: red elephant restricted to rows 5-9, black elephant to rows 0-4.
 * The "eye" position (intermediate orthogonal cell) must be empty - cannot be blocked.
 * Represents the minister/counselor piece in Xiangqi.
 *
 * @param board - Current board state
 * @param piece - The elephant piece
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for an Elephant
 */
function isValidElephantMove(board, piece, from, to) {
    const isRed = piece.side === types_1.Side.RED;
    if (isRed && to.row < 5)
        return false;
    if (!isRed && to.row > 4)
        return false;
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
 * Validates a Horse (马) move.
 * Horse moves 1 step orthogonally then 1 step diagonally, forming an L-shape.
 * The "leg" position (the orthogonal cell horse passes through) must be empty.
 * Can jump over pieces unlike chariot/cannon. L-shape can be 2 rows + 1 col OR 1 row + 2 cols.
 *
 * @param board - Current board state
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for a Horse
 */
function isValidHorseMove(board, from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
        return false;
    }
    let legRow;
    let legCol;
    if (rowDiff === 2) {
        legRow = from.row + (to.row > from.row ? 1 : -1);
        legCol = from.col;
    }
    else {
        legRow = from.row;
        legCol = from.col + (to.col > from.col ? 1 : -1);
    }
    return board[legRow][legCol] === null;
}
/**
 * Validates a Chariot (车) move.
 * Chariot moves any distance orthogonally (like rook in chess) but cannot jump pieces.
 * Path between from and to must be completely clear of all pieces.
 * Can capture opponent pieces but must land on them during move.
 *
 * @param board - Current board state
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for a Chariot
 */
function isValidChariotMove(board, from, to) {
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
 * Validates a Cannon (炮) move.
 * Cannon moves orthogonally like the Chariot, but captures differently:
 * - Moving to empty square: path must be completely clear (0 screen pieces)
 * - Capturing opponent piece: must have exactly 1 screen piece (hurdle) between start and target
 * The cannon "jumps" over pieces to capture, unlike chariot which cannot jump.
 *
 * @param board - Current board state
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for a Cannon
 */
function isValidCannonMove(board, from, to) {
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
    }
    else {
        return pieceCount === 1;
    }
}
/**
 * Validates a Soldier (兵/卒) move.
 * Before crossing the river (red: rows 5-9, black: rows 0-4): moves 1 step forward only.
 * After crossing river (red: rows 0-4, black: rows 5-9): can also move 1 step sideways.
 * Cannot move backward. Red moves toward row 0 (up), black moves toward row 9 (down).
 *
 * @param piece - The soldier piece with side information
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move is valid for a Soldier
 */
function isValidSoldierMove(piece, from, to) {
    const isRed = piece.side === types_1.Side.RED;
    const rowDiff = to.row - from.row;
    const colDiff = Math.abs(to.col - from.col);
    if (colDiff > 1)
        return false;
    if (colDiff === 1 && rowDiff !== 0)
        return false;
    const hasCrossedRiver = isRed ? from.row <= 4 : from.row >= 5;
    if (!hasCrossedRiver) {
        if (colDiff === 1)
            return false;
        return isRed ? rowDiff === -1 : rowDiff === 1;
    }
    if (colDiff === 1) {
        return rowDiff === 0;
    }
    return isRed ? rowDiff === -1 : rowDiff === 1;
}
/**
 * Simulates a move and checks if it would expose the moving player's general to direct attack.
 * In Xiangqi, having generals face each other across an open file is illegal (forbidden check).
 * This function clones the board, performs the move, then checks if the moving general is in check.
 *
 * @param board - Current board state
 * @param piece - The piece being moved
 * @param from - Current position
 * @param to - Target position
 * @returns true if the move would expose own general to attack (illegal move)
 */
function wouldExposeGeneral(board, piece, from, to) {
    const tempBoard = board.map(row => [...row]);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    let redGeneralPos = null;
    let blackGeneralPos = null;
    for (let row = 0; row < types_1.BOARD_ROWS; row++) {
        for (let col = 0; col < types_1.BOARD_COLS; col++) {
            const p = tempBoard[row][col];
            if (p?.type === types_1.PieceType.GENERAL) {
                if (p.side === types_1.Side.RED)
                    redGeneralPos = { row, col };
                else
                    blackGeneralPos = { row, col };
            }
        }
    }
    if (!redGeneralPos || !blackGeneralPos)
        return false;
    if (redGeneralPos.col !== blackGeneralPos.col)
        return false;
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
 * Checks if either general has been captured, determining game over condition.
 * In Xiangqi, capturing the opponent's general ends the game immediately.
 *
 * @param board - Current board state as 2D array of (Piece | null)
 * @returns Object with captured=true if a general is missing, winner is the surviving side
 */
function isGeneralCaptured(board) {
    let redGeneral = false;
    let blackGeneral = false;
    for (let row = 0; row < types_1.BOARD_ROWS; row++) {
        for (let col = 0; col < types_1.BOARD_COLS; col++) {
            const piece = board[row][col];
            if (piece?.type === types_1.PieceType.GENERAL) {
                if (piece.side === types_1.Side.RED)
                    redGeneral = true;
                else
                    blackGeneral = true;
            }
        }
    }
    if (!redGeneral)
        return { captured: true, winner: types_1.Side.BLACK };
    if (!blackGeneral)
        return { captured: true, winner: types_1.Side.RED };
    return { captured: false };
}
/**
 * Returns all valid destination positions for a given piece on the current board.
 * Scans all 90 board positions and returns only those that pass isValidMove validation.
 *
 * @param board - Current board state as 2D array of (Piece | null)
 * @param piece - The piece to get valid moves for, must include position
 * @returns Array of valid {row, col} positions the piece can move to
 */
function getValidMoves(board, piece) {
    const moves = [];
    for (let row = 0; row < types_1.BOARD_ROWS; row++) {
        for (let col = 0; col < types_1.BOARD_COLS; col++) {
            if (isValidMove(board, piece, piece.position, { row, col })) {
                moves.push({ row, col });
            }
        }
    }
    return moves;
}
//# sourceMappingURL=gameLogic.js.map