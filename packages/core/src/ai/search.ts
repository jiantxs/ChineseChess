/**
 * Alpha-Beta Search Engine for Chinese Chess AI
 *
 * Algorithm: Iterative Deepening + Alpha-Beta Pruning + Multiple Optimizations
 *
 * Optimizations:
 *   - Transposition Table    - Avoid duplicate searches
 *   - Null Move Pruning      - Quickly eliminate obviously bad positions
 *   - History Heuristic      - Prioritize historically good moves
 *   - Killer Heuristic       - Record cut moves at same depth
 *   - MVV/LVA Capture Sorting - Prioritize capturing high-value pieces
 *   - Iterative Deepening   - Progressive deepening, better time utilization
 *
 * Search Framework: PVS (Principal Variation Search) + NegaMax
 */

import {
  MATE_VALUE,
  BAN_VALUE,
  WIN_VALUE,
  DRAW_VALUE,
  NULL_OKAY_MARGIN,
  NULL_SAFE_MARGIN,
  LIMIT_DEPTH,
} from './constants';
import { HashTable, HASH_ALPHA, HASH_BETA, HASH_EXACT } from './hashtable';
import { MoveSort, HistoryTable } from './movesort';
import { generateMoves, isChecked } from './movegen';
import { evaluate, repValue, mateValue } from './evaluate';
import { Position } from './position';

export class Search {
  private _pos: Position;
  private _hash: HashTable;
  private _history: HistoryTable;
  private _killers: number[][];
  bestMove: number = 0;

  constructor(pos: Position) {
    this._pos = pos;
    this._hash = new HashTable();
    this._history = new HistoryTable();

    this._killers = [];
    for (let i = 0; i < LIMIT_DEPTH; i++) {
      this._killers.push([0, 0]);
    }
  }

  /**
   * Main entry point for iterative deepening search
   * @param maxDepth Maximum search depth (default: LIMIT_DEPTH)
   * @param millis Time limit in milliseconds (optional)
   * @returns Final score for this search
   */
  searchMain(maxDepth?: number, millis?: number): number {
    this.bestMove = 0;
    let vl = 0;
    const limit = maxDepth || LIMIT_DEPTH;
    const deadline = millis != null && millis > 0 ? Date.now() + millis : Infinity;

    // Reset tables for each search
    this._hash.clear();
    this._history.clear();
    for (let i = 0; i < LIMIT_DEPTH; i++) {
      this._killers[i][0] = 0;
      this._killers[i][1] = 0;
    }
    this._pos.distance = 0;

    // Iterative deepening: from 1 to limit layers
    for (let depth = 1; depth <= limit; depth++) {
      vl = this._searchRoot(depth);

      // Found checkmate, no need to deepen further
      if (vl > WIN_VALUE || vl < -WIN_VALUE) {
        break;
      }

      // Time exceeded
      if (Date.now() >= deadline) {
        break;
      }

      // History score decay (avoid shallow history dominating deep sorting)
      this._history.decay();
    }

    return vl;
  }

  /**
   * Search root node with full window
   * @param depth Current search depth
   * @returns Best evaluation at root node
   */
  private _searchRoot(depth: number): number {
    const pos = this._pos;
    let alpha = -MATE_VALUE;
    const beta = MATE_VALUE;

    // Query transposition table (root node also queries, mainly for best move hint)
    const hashResult = this._hash.get(
      pos.zobristKey,
      pos.zobristLock,
      depth,
      alpha,
      beta,
      pos.distance
    );

    const moves = generateMoves(pos);
    const sort = new MoveSort(
      moves,
      pos,
      hashResult.mv,
      this._killers[pos.distance],
      this._history.table
    );

    let bestMove = 0;
    let mv: number;

    while ((mv = sort.next()) !== -1) {
      if (!pos.makeMove(mv, isChecked)) {
        continue;
      }
      const vl = -this._searchFull(-beta, -alpha, depth - 1, false);
      pos.undoMakeMove();

      if (vl > alpha) {
        alpha = vl;
        bestMove = mv;
        if (alpha >= beta) {
          break;
        }
      }
    }

    if (bestMove !== 0) {
      this.bestMove = bestMove;
      this._hash.set(
        pos.zobristKey,
        pos.zobristLock,
        depth,
        HASH_EXACT,
        alpha,
        bestMove,
        pos.distance
      );
    }

    return alpha;
  }

  /**
   * Full alpha-beta search with optimizations
   * @param alpha Alpha bound
   * @param beta Beta bound
   * @param depth Remaining search depth
   * @param nullOk Whether null move pruning is allowed
   * @returns Evaluation score (from current player's perspective)
   */
  private _searchFull(alpha: number, beta: number, depth: number, nullOk: boolean): number {
    const pos = this._pos;

    // 1. Leaf node: quiescence search
    if (depth <= 0) {
      return this._searchQuiet(alpha, beta);
    }

    // 2. Repetition detection
    const rep = repValue(pos);
    if (rep !== 0) {
      return rep;
    }

    // 3. Transposition table query
    const hashResult = this._hash.get(
      pos.zobristKey,
      pos.zobristLock,
      depth,
      alpha,
      beta,
      pos.distance
    );
    if (hashResult.hit) {
      return hashResult.vl;
    }

    // 4. Null move pruning (only available when not in check)
    if (nullOk && !pos.inCheck() && pos.distance > 0) {
      const vlNull = evaluate(pos);
      if (vlNull >= beta + NULL_OKAY_MARGIN) {
        pos.nullMove(isChecked);
        const vl = -this._searchFull(-beta, 1 - beta, depth - 3, false);
        pos.undoNullMove();
        if (vl >= beta) {
          if (vl >= WIN_VALUE) {
            return beta; // Avoid false checkmate
          }
          // Double verification (verify with reduced depth)
          if (vlNull >= beta + NULL_SAFE_MARGIN) {
            return vl;
          }
          depth--;
        }
      }
    }

    // 5. Generate and sort moves
    const moves = generateMoves(pos);
    const sort = new MoveSort(
      moves,
      pos,
      hashResult.mv,
      this._killers[pos.distance],
      this._history.table
    );

    let hashFlag = HASH_ALPHA;
    let bestMove = 0;
    let bestVl = -MATE_VALUE;
    let mv: number;

    while ((mv = sort.next()) !== -1) {
      if (!pos.makeMove(mv, isChecked)) {
        continue;
      }
      const vl = -this._searchFull(-beta, -alpha, depth - 1, true);
      pos.undoMakeMove();

      if (vl > bestVl) {
        bestVl = vl;
        if (vl >= beta) {
          // Beta cutoff
          hashFlag = HASH_BETA;
          bestMove = mv;
          // Update killer moves (non-captures)
          if (pos.squares[mv >> 8] === 0) {
            const killers = this._killers[pos.distance];
            if (killers[0] !== mv) {
              killers[1] = killers[0];
              killers[0] = mv;
            }
          }
          // Update history score
          this._history.add(mv, depth);
          break;
        }
        if (vl > alpha) {
          hashFlag = HASH_EXACT;
          alpha = vl;
          bestMove = mv;
        }
      }
    }

    // 6. No legal moves -> checkmate or stalemate
    if (bestVl === -MATE_VALUE) {
      return mateValue(pos);
    }

    // 7. Store in transposition table
    this._hash.set(
      pos.zobristKey,
      pos.zobristLock,
      depth,
      hashFlag,
      bestVl,
      bestMove,
      pos.distance
    );

    return bestVl;
  }

  /**
   * Quiescence search (only search capture moves, eliminate horizon effect)
   * @param alpha Alpha bound
   * @param beta Beta bound
   * @returns Evaluation score
   */
  private _searchQuiet(alpha: number, beta: number): number {
    const pos = this._pos;

    // Repetition detection
    const rep = repValue(pos);
    if (rep !== 0) {
      return rep;
    }

    // Static evaluation
    let vl = evaluate(pos);
    if (vl >= beta) {
      return vl;
    }
    if (vl > alpha) {
      alpha = vl;
    }

    // Only generate capture moves (pseudo-legal)
    const allMoves = generateMoves(pos);
    const capMoves = allMoves.filter((mv) => pos.squares[mv >> 8] !== 0);

    // Sort capture moves by MVV (Most Valuable Victim)
    capMoves.sort((a, b) => {
      const va = pos.squares[a >> 8] & 7;
      const vb = pos.squares[b >> 8] & 7;
      return vb - va; // Higher value piece first
    });

    for (const mv of capMoves) {
      if (!pos.makeMove(mv, isChecked)) {
        continue;
      }
      const childVl = -this._searchQuiet(-beta, -alpha);
      pos.undoMakeMove();

      if (childVl > vl) {
        vl = childVl;
        if (vl >= beta) {
          return vl;
        }
        if (vl > alpha) {
          alpha = vl;
        }
      }
    }

    return vl;
  }
}
