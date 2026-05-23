/**
 * Position class for the Chinese Chess AI engine.
 *
 * Manages board state, Zobrist hashing, move history,
 * and position evaluation tracking.
 *
 * @module ai/position
 */

import { DYNAMIC_CHESS_VALUE, IN_BOARD } from './tables';
import { ZOBRIST, zobristPcIdx } from './zobrist';
import { Piece, Side, PieceType } from '../types';

/**
 * Move record stored in the history stack.
 */
interface MoveRecord {
  mv: number;
  captured: number;
  prevKey: number;
  prevLock: number;
  inCheck: boolean;
}

/**
 * Coordinate in AI engine's internal representation.
 * sq = (y << 4) | x, with y=3-12, x=3-11 for valid board positions.
 */
type Sq = number;

/**
 * Side encoding: 0=RED, 1=BLACK
 */
type Player = 0 | 1;

/**
 * Map piece type string enum to numeric index.
 * PieceType: GENERAL=0, ADVISOR=1, ELEPHANT=2, HORSE=3, CHARIOT=4, CANNON=5, SOLDIER=6
 */
const PIECE_TYPE_INDEX: Record<PieceType, number> = {
  [PieceType.GENERAL]: 0,
  [PieceType.ADVISOR]: 1,
  [PieceType.ELEPHANT]: 2,
  [PieceType.HORSE]: 3,
  [PieceType.CHARIOT]: 4,
  [PieceType.CANNON]: 5,
  [PieceType.SOLDIER]: 6,
};

/**
 * Position class representing a chess position for the AI engine.
 *
 * Maintains:
 * - Board state (squares array)
 * - Current player (sdPlayer: 0=RED, 1=BLACK)
 * - Positional scores (vlRed, vlBlack)
 * - Zobrist hashing (key and lock)
 * - Move history for undo operations
 */
export class Position {
  /** Current player to move: 0=RED, 1=BLACK */
  sdPlayer: Player = 0;

  /** 256-length board array, piece encoding: 0=empty, 8-14=red, 16-22=black */
  squares: number[];

  /** Red positional score (sum of piece-square table values) */
  vlRed: number = 0;

  /** Black positional score */
  vlBlack: number = 0;

  /** Zobrist hash key for transposition table lookup */
  zobristKey: number = 0;

  /** Zobrist lock for hash collision reduction */
  zobristLock: number = 0;

  /** Search depth from root position */
  distance: number = 0;

  /** Move history stack */
  private _moveStack: MoveRecord[];

  /**
   * Flip a square coordinate vertically (for black's perspective).
   * @param sq - Square coordinate
   * @returns Flipped square
   */
  private static flipSq(sq: number): number {
    return 254 - sq;
  }

  /**
   * Create a new empty position.
   */
  constructor() {
    this.squares = new Array(256).fill(0);
    this._moveStack = [
      { mv: 0, captured: 0, prevKey: 0, prevLock: 0, inCheck: false },
    ];
  }

  /**
   * Add or remove a piece at a square, updating positional score and Zobrist.
   *
   * @param sq - Square coordinate
   * @param pc - Piece encoding (8-14 for red, 16-22 for black)
   * @param isDel - true to remove piece, false to add
   */
  addPiece(sq: Sq, pc: number, isDel: boolean): void {
    this.squares[sq] = isDel ? 0 : pc;
    const pcIdx = zobristPcIdx(pc);

    if (pc < 16) {
      // Red piece (8-14)
      const typeIdx = pc - 8;
      this.vlRed += isDel
        ? -DYNAMIC_CHESS_VALUE[typeIdx][sq]
        : DYNAMIC_CHESS_VALUE[typeIdx][sq];
    } else {
      // Black piece (16-22) - use flipped coordinate for table lookup
      const typeIdx = pc - 16;
      this.vlBlack += isDel
        ? -DYNAMIC_CHESS_VALUE[typeIdx][Position.flipSq(sq)]
        : DYNAMIC_CHESS_VALUE[typeIdx][Position.flipSq(sq)];
    }

    // Update Zobrist hash
    this.zobristKey ^= ZOBRIST.keyTable[pcIdx][sq];
    this.zobristLock ^= ZOBRIST.lockTable[pcIdx][sq];
  }

  /**
   * Switch the current player, updating Zobrist.
   */
  changeSide(): void {
    this.sdPlayer = this.sdPlayer === 0 ? 1 : 0;
    this.zobristKey ^= ZOBRIST.playerKey;
    this.zobristLock ^= ZOBRIST.playerLock;
  }

  /**
   * Execute a move (no legality checking - caller must verify).
   *
   * @param mv - Encoded move (bits 0-7 = src, bits 8-15 = dst)
   * @param checkedFn - Function to check if current player is in check
   * @returns true if move executed successfully, false if it causes self-check
   */
  makeMove(mv: number, checkedFn: (pos: Position) => boolean): boolean {
    const prevKey = this.zobristKey;
    const prevLock = this.zobristLock;
    const captured = this._movePiece(mv);

    // Check if move leaves own general in check
    if (checkedFn(this)) {
      this._undoMovePiece(mv, captured);
      return false;
    }

    this.changeSide();
    const inCheck = checkedFn(this);

    this._moveStack.push({ mv, captured, prevKey, prevLock, inCheck });
    this.distance++;
    return true;
  }

  /**
   * Undo the last move, restoring position and Zobrist state.
   */
  undoMakeMove(): void {
    this.distance--;
    const { mv, captured, prevKey, prevLock } = this._moveStack.pop()!;
    this.changeSide();
    this._undoMovePiece(mv, captured);
    // Restore Zobrist (changeSide modified it, but prevKey contains pre-move state)
    this.zobristKey = prevKey;
    this.zobristLock = prevLock;
  }

  /**
   * Execute a null move (side switch only, for null move pruning).
   *
   * @param checkedFn - Function to check if current player is in check
   */
  nullMove(checkedFn: (pos: Position) => boolean): void {
    const prevKey = this.zobristKey;
    const prevLock = this.zobristLock;
    this.changeSide();
    this._moveStack.push({ mv: 0, captured: 0, prevKey, prevLock, inCheck: false });
    this.distance++;
  }

  /**
   * Undo a null move.
   */
  undoNullMove(): void {
    this.distance--;
    const { prevKey, prevLock } = this._moveStack.pop()!;
    this.changeSide();
    this.zobristKey = prevKey;
    this.zobristLock = prevLock;
  }

  /**
   * Check if the current player is in check.
   * @returns true if current player is in check
   */
  inCheck(): boolean {
    return this._moveStack[this._moveStack.length - 1].inCheck;
  }

  /**
   * Get the move history stack (for external read-only access).
   * @returns Array of move records
   */
  get moveStack(): readonly MoveRecord[] {
    return this._moveStack;
  }

  /**
   * Clear all pieces from the board.
   */
  clearBoard(): void {
    this.sdPlayer = 0;
    this.squares.fill(0);
    this.vlRed = 0;
    this.vlBlack = 0;
    this.zobristKey = 0;
    this.zobristLock = 0;
  }

  /**
   * Initialize position from the project's board representation.
   *
   * @param board - 10x9 array of Piece or null
   * @param side - Current player to move (Side.RED or Side.BLACK)
   */
  fromBoard(board: (Piece | null)[][], side: Side): void {
    this.clearBoard();
    this.sdPlayer = side === Side.RED ? 0 : 1;

    const BOARD_ROWS = 10;
    const BOARD_COLS = 9;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const piece = board[row][col];
        if (piece === null) continue;

        // Convert to AI engine square: sq = ((row + 3) << 4) | (col + 3)
        const y = row + 3;
        const x = col + 3;
        const sq = (y << 4) | x;

        // Get numeric type index for piece-square tables
        const typeIdx = PIECE_TYPE_INDEX[piece.type];

        // Encode piece: RED = 8 + typeIndex, BLACK = 16 + typeIndex
        const encoding = piece.side === Side.RED ? 8 + typeIdx : 16 + typeIdx;
        this.squares[sq] = encoding;

        // Update positional score
        const pcIdx = zobristPcIdx(encoding);

        if (piece.side === Side.RED) {
          this.vlRed += DYNAMIC_CHESS_VALUE[typeIdx][sq];
        } else {
          this.vlBlack += DYNAMIC_CHESS_VALUE[typeIdx][Position.flipSq(sq)];
        }

        // Update Zobrist
        this.zobristKey ^= ZOBRIST.keyTable[pcIdx][sq];
        this.zobristLock ^= ZOBRIST.lockTable[pcIdx][sq];
      }
    }

    // Include player key in hash
    this.zobristKey ^= ZOBRIST.playerKey;
    this.zobristLock ^= ZOBRIST.playerLock;

    // Set initial check status (assume not in check for initial position)
    this._moveStack = [
      { mv: 0, captured: 0, prevKey: this.zobristKey, prevLock: this.zobristLock, inCheck: false },
    ];
  }

  /**
   * Move a piece internally (called by makeMove).
   *
   * @param mv - Encoded move
   * @returns Captured piece encoding (0 if none)
   */
  private _movePiece(mv: number): number {
    const src = mv & 0xff;
    const dst = (mv >> 8) & 0xff;
    const captured = this.squares[dst];

    if (captured > 0) {
      this.addPiece(dst, captured, true);
    }

    const moving = this.squares[src];
    this.addPiece(src, moving, true);
    this.addPiece(dst, moving, false);

    return captured;
  }

  /**
   * Undo a piece move (called by undoMakeMove).
   *
   * @param mv - Encoded move
   * @param captured - Captured piece encoding from the original move
   */
  private _undoMovePiece(mv: number, captured: number): void {
    const src = mv & 0xff;
    const dst = (mv >> 8) & 0xff;

    const moving = this.squares[dst];
    this.addPiece(dst, moving, true);
    this.addPiece(src, moving, false);

    if (captured > 0) {
      this.addPiece(dst, captured, false);
    }
  }
}
