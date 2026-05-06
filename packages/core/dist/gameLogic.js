"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidMove = isValidMove;
exports.isGeneralCaptured = isGeneralCaptured;
exports.getValidMoves = getValidMoves;
const types_1 = require("./types");
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