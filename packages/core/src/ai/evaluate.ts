/**
 * Position evaluation module for Chinese Chess AI engine.
 *
 * All evaluations are from the perspective of the current player to move:
 *   - Positive value → favorable for current player
 *   - Negative value → unfavorable for current player
 *
 * Evaluation consists of:
 *   1. Positional score (maintained via vlRed/vlBlack in Position)
 *   2. First move bonus (ADVANCED_VALUE) to encourage active play
 *
 * This module also provides:
 *   - Repetition detection (perpetual check → loss; general repetition → draw)
 *   - Mate/stalemate detection (no legal moves → loss/draw)
 *
 * @module ai/evaluate
 */

import { MATE_VALUE, DRAW_VALUE, ADVANCED_VALUE, WIN_VALUE } from './constants';
import type { Position } from './position';

/**
 * Calculate the static evaluation of a position from the current player's perspective.
 *
 * @param pos - The position to evaluate
 * @returns Evaluation score (positive = good for current player, negative = bad)
 */
export function evaluate(pos: Position): number {
  const vl =
    pos.sdPlayer === 0 ? pos.vlRed - pos.vlBlack : pos.vlBlack - pos.vlRed;
  const score = vl + ADVANCED_VALUE;
  return score === 0 ? DRAW_VALUE : score;
}

/**
 * Check for repeated positions (draw detection).
 *
 * Traverses move history to detect:
 *   - Perpetual check (one side continuously checking → that side loses)
 *   - General repetition (both sides checking equally → draw)
 *
 * @param pos - The position to check
 * @param recur - Number of repetitions to detect (default: 1)
 * @returns 0 if no repetition; otherwise returns appropriate penalty score
 */
export function repValue(pos: Position, recur = 1): number {
  const stack = pos.moveStack;
  const len = stack.length;

  let selfSide = true;
  let repSelf = 0;
  let repOpp = 0;
  let rep = 0;

  // Search backwards through move history in pairs (one move each side)
  for (let i = len - 1; i >= 1; i--) {
    const entry = stack[i];

    // Stop at irreversible moves (captures or null moves)
    if (entry.captured > 0 || entry.mv === 0) {
      break;
    }

    // Check if this historical position matches current position
    if (entry.prevKey === pos.zobristKey && entry.prevLock === pos.zobristLock) {
      rep++;
      if (rep >= recur) {
        // Determine penalty based on who was checking more
        return pos.sdPlayer === 0
          ? _repScore(repSelf, repOpp)
          : _repScore(repOpp, repSelf);
      }
    }

    if (selfSide) {
      repSelf += entry.inCheck ? 2 : 0;
    } else {
      repOpp += entry.inCheck ? 2 : 0;
    }
    selfSide = !selfSide;
  }

  return 0;
}

/**
 * Determine repetition penalty based on checking counts.
 *
 * @param selfChecks - Number of times current side was checking
 * @param oppChecks - Number of times opponent was checking
 * @returns Penalty score from current player's perspective
 */
function _repScore(selfChecks: number, oppChecks: number): number {
  if (selfChecks > oppChecks) {
    // Current side perpetuating check → loses
    return -WIN_VALUE;
  }
  if (oppChecks > selfChecks) {
    // Opponent perpetuating check → current side wins
    return WIN_VALUE;
  }
  // Equal checking or none → draw
  return -DRAW_VALUE;
}

/**
 * Calculate score when current player has no legal moves.
 *
 * @param pos - The position (should have no legal moves)
 * @returns Checkmate score (negative, smaller magnitude = sooner checkmate)
 *          or stalemate score (negative draw value)
 */
export function mateValue(pos: Position): number {
  return pos.inCheck() ? pos.distance - MATE_VALUE : -DRAW_VALUE;
}
