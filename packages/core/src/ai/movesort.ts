/**
 * Move Ordering Module for Chinese Chess AI Engine
 *
 * Good move ordering is critical for alpha-beta pruning efficiency:
 * prioritizing "likely better" moves enables earlier beta cutoffs.
 *
 * Priority order (highest to lowest):
 *   1. Hash move (from transposition table) - usually the best move already searched
 *   2. Capture moves (MVV/LVA) - captures of high-value pieces ranked first
 *   3. Killer moves - non-capture moves that caused beta cutoffs at this depth
 *   4. History moves - moves that performed well in past searches
 *   5. Remaining moves (unsorted)
 *
 * @module ai/movesort
 */

import { MVV_VALUE } from './constants';
import { oppTag } from './movegen';
import { moveDst } from './adapter';
import type { Position } from './position';

/**
 * Move sorting class for alpha-beta search.
 *
 * Uses selection sort (single step per call) for efficiency -
 * once a cutoff is found, remaining moves don't need full sorting.
 */
export class MoveSort {
  /** Parallel scores array */
  private readonly _scores: Int32Array;

  /** Move list (modified during sorting) */
  private readonly _moves: number[];

  /**
   * @param moves     Move array from generateMoves
   * @param pos       Current position (for checking captures)
   * @param hashMove  Best move from transposition table (0 if none)
   * @param killers   Two killer moves for this depth [killer0, killer1]
   * @param history   History table Int32Array
   */
  constructor(
    moves: number[],
    pos: Position,
    hashMove: number,
    killers: number[],
    history: Int32Array
  ) {
    this._scores = new Int32Array(moves.length);
    this._moves = moves;

    const sqOpp = oppTag(pos.sdPlayer as 0 | 1);

    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      const dst = moveDst(mv);

      if (mv === hashMove) {
        // 1. Hash move: highest priority
        this._scores[i] = 0x7fffffff;
      } else {
        const target = pos.squares[dst];
        if ((target & sqOpp) !== 0) {
          // 2. Capture move: MVV (Most Valuable Victim)
          this._scores[i] = 0x100000 + MVV_VALUE[target & 7];
        } else if (mv === killers[0]) {
          // 3a. Killer move 0
          this._scores[i] = 0x80000;
        } else if (mv === killers[1]) {
          // 3b. Killer move 1
          this._scores[i] = 0x40000;
        } else {
          // 4. History score
          this._scores[i] = history[mv & 0xffff] || 0;
        }
      }
    }
  }

  /**
   * Return the best move from the remaining list (selection sort single step).
   *
   * For alpha-beta, once a cutoff is found, remaining moves don't need sorting.
   * Selection sort is more efficient than full sorting for this use case.
   *
   * @returns Move encoding, or -1 if no moves remain
   */
  next(): number {
    if (this._moves.length === 0) {
      return -1;
    }

    // Find highest score move
    let bestIdx = 0;
    for (let i = 1; i < this._moves.length; i++) {
      if (this._scores[i] > this._scores[bestIdx]) {
        bestIdx = i;
      }
    }

    const mv = this._moves[bestIdx];
    // Swap with last element and shorten array
    const lastIdx = this._moves.length - 1;
    this._moves[bestIdx] = this._moves[lastIdx];
    this._scores[bestIdx] = this._scores[lastIdx];
    this._moves.length--;

    return mv;
  }
}

/**
 * History table for move ordering (history heuristic).
 *
 * Records the "performance score" of each move in search:
 *   - Move causes beta cutoff: history score += 2^depth (deeper = higher weight)
 *   - Indexed by (src << 8 | dst), size 65536
 *
 * History scores decay (right shift by 1) before each new search iteration
 * to prevent outdated information from dominating ordering.
 */
export class HistoryTable {
  private readonly _table: Int32Array;

  constructor() {
    this._table = new Int32Array(65536);
  }

  /** Clear history table (call at start of new game) */
  clear(): void {
    this._table.fill(0);
  }

  /** Decay all history scores (call before each iterative deepening iteration) */
  decay(): void {
    for (let i = 0; i < this._table.length; i++) {
      this._table[i] >>= 1;
    }
  }

  /**
   * Add score to a move's history entry.
   * @param mv    Move encoding
   * @param depth Current search depth (score weight = 2^depth)
   */
  add(mv: number, depth: number): void {
    this._table[mv & 0xffff] += 1 << depth;
  }

  /** Get history score for a move */
  get(mv: number): number {
    return this._table[mv & 0xffff];
  }

  /** Return underlying array (for MoveSort direct access, avoiding function call overhead) */
  get table(): Int32Array {
    return this._table;
  }
}
