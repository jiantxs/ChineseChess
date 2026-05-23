/**
 * Move Generation Module for Chinese Chess AI Engine
 *
 * Generates all pseudo-legal moves for a given position.
 * Legality checking (self-check) is done by Position.makeMove.
 *
 * @module ai/movegen
 */

import {
  IN_BOARD,
  IN_FORT,
  LEGAL_SPAN,
  KNIGHT_PIN,
  KING_DELTA,
  ADVISOR_DELTA,
  KNIGHT_DELTA,
  KNIGHT_CHECK_DELTA,
} from './tables';
import { makeMove } from './adapter';
import type { Position } from './position';

/**
 * Get side tag for piece encoding.
 * Red pieces: 8-15, Black pieces: 16-23
 * @param side - 0 for red, 1 for black
 */
export function sideTag(side: 0 | 1): number {
  return side === 0 ? 8 : 16;
}

/**
 * Get opponent tag for piece encoding.
 * @param side - 0 for red, 1 for black
 */
export function oppTag(side: 0 | 1): number {
  return side === 0 ? 16 : 8;
}

/**
 * Generate all pseudo-legal moves for the current player.
 * Does NOT check for self-check - that is done by Position.makeMove.
 *
 * @param pos - Current position with squares array and sdPlayer
 * @returns Array of encoded moves (sqSrc | sqDst << 8)
 */
export function generateMoves(pos: Position): number[] {
  const moves: number[] = [];
  const sqSelf = sideTag(pos.sdPlayer);
  const sqOpp = oppTag(pos.sdPlayer);

  for (let sqSrc = 0; sqSrc < 256; sqSrc++) {
    const pc = pos.squares[sqSrc];
    if ((pc & sqSelf) === 0) {
      continue; // Not own piece
    }

    const type = pc & 7; // Piece type (0-6)

    switch (type) {
      case 0: { // General - move one step orthogonal within palace
        for (const delta of KING_DELTA) {
          const sqDst = sqSrc + delta;
          if (!IN_BOARD[sqDst] || !IN_FORT[sqDst]) {
            continue;
          }
          const target = pos.squares[sqDst];
          if ((target & sqSelf) === 0) {
            moves.push(makeMove(sqSrc, sqDst));
          }
        }
        break;
      }
      case 1: { // Advisor - move one step diagonal within palace
        for (const delta of ADVISOR_DELTA) {
          const sqDst = sqSrc + delta;
          if (!IN_BOARD[sqDst] || !IN_FORT[sqDst]) {
            continue;
          }
          const target = pos.squares[sqDst];
          if ((target & sqSelf) === 0) {
            moves.push(makeMove(sqSrc, sqDst));
          }
        }
        break;
      }
      case 2: { // Elephant - two-step diagonal, cannot cross river
        for (const delta of ADVISOR_DELTA) {
          const sqMid = sqSrc + delta; // Eye position
          const sqDst = sqSrc + delta * 2; // Landing position
          if (!IN_BOARD[sqDst]) {
            continue;
          }
          // Cannot cross river (bit 0x80 check)
          if (((sqDst ^ sqSrc) & 0x80) !== 0) {
            continue;
          }
          // Eye must be empty
          if (pos.squares[sqMid] !== 0) {
            continue;
          }
          const target = pos.squares[sqDst];
          if ((target & sqSelf) === 0) {
            moves.push(makeMove(sqSrc, sqDst));
          }
        }
        break;
      }
      case 3: { // Horse - L-shape, leg must be empty
        for (let dir = 0; dir < 4; dir++) {
          const sqMid = sqSrc + KING_DELTA[dir]; // Leg position
          if (!IN_BOARD[sqMid] || pos.squares[sqMid] !== 0) {
            continue; // Leg blocked
          }
          for (const delta of KNIGHT_DELTA[dir]) {
            const sqDst = sqSrc + delta;
            if (!IN_BOARD[sqDst]) {
              continue;
            }
            const target = pos.squares[sqDst];
            if ((target & sqSelf) === 0) {
              moves.push(makeMove(sqSrc, sqDst));
            }
          }
        }
        break;
      }
      case 4: { // Chariot - straight line, any distance, cannot jump
        for (const delta of KING_DELTA) {
          let sqDst = sqSrc + delta;
          while (IN_BOARD[sqDst]) {
            const target = pos.squares[sqDst];
            if (target === 0) {
              moves.push(makeMove(sqSrc, sqDst));
            } else {
              if ((target & sqOpp) !== 0) {
                moves.push(makeMove(sqSrc, sqDst));
              }
              break;
            }
            sqDst += delta;
          }
        }
        break;
      }
      case 5: { // Cannon - straight line, capture with exactly 1 screen
        for (const delta of KING_DELTA) {
          let sqDst = sqSrc + delta;
          // Non-capture moves (no screen)
          while (IN_BOARD[sqDst]) {
            if (pos.squares[sqDst] === 0) {
              moves.push(makeMove(sqSrc, sqDst));
            } else {
              break;
            }
            sqDst += delta;
          }
          // Capture moves (exactly one screen)
          sqDst += delta;
          while (IN_BOARD[sqDst]) {
            const target = pos.squares[sqDst];
            if (target !== 0) {
              if ((target & sqOpp) !== 0) {
                moves.push(makeMove(sqSrc, sqDst));
              }
              break;
            }
            sqDst += delta;
          }
        }
        break;
      }
      case 6: { // Soldier - forward one step, sideways after crossing river
        // Forward direction (red goes up -16, black goes down +16)
        const forward = pos.sdPlayer === 0 ? -16 : 16;
        const sqFwd = sqSrc + forward;
        if (IN_BOARD[sqFwd]) {
          const target = pos.squares[sqFwd];
          if ((target & sqSelf) === 0) {
            moves.push(makeMove(sqSrc, sqFwd));
          }
        }
        // Sideways after crossing river
        // Red (sdPlayer=0): home y>=8 (sq&0x80!=0), crossed river sq&0x80==0
        // Black (sdPlayer=1): home y<8 (sq&0x80==0), crossed river sq&0x80!=0
        // Unified: crossed = ((sqSrc ^ (pos.sdPlayer === 0 ? 0x80 : 0)) & 0x80) !== 0
        if (((sqSrc ^ (pos.sdPlayer === 0 ? 0x80 : 0)) & 0x80) !== 0) {
          for (const delta of [-1, 1]) {
            const sqLR = sqSrc + delta;
            if (IN_BOARD[sqLR]) {
              const target = pos.squares[sqLR];
              if ((target & sqSelf) === 0) {
                moves.push(makeMove(sqSrc, sqLR));
              }
            }
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return moves;
}

/**
 * Check if the current player's king is under attack.
 * Checks for:
 * a. Face-to-face with opponent king (same column, no pieces between)
 * b. Knight attacks
 * c. Chariot/Cannon attacks (straight line)
 * d. Soldier/Pawn attacks
 *
 * @param pos - Current position
 * @returns true if king is in check
 */
export function isChecked(pos: Position): boolean {
  const sqSelf = sideTag(pos.sdPlayer);
  const sqOpp = oppTag(pos.sdPlayer);

  // Find own king's position
  let sqKing = -1;
  for (let sq = 0; sq < 256; sq++) {
    if (pos.squares[sq] === sqSelf) {
      sqKing = sq;
      break;
    }
  }
  if (sqKing < 0) {
    return true; // King captured (illegal position, considered in check)
  }

  // 1. Check for face-to-face with opponent king
  for (const delta of KING_DELTA) {
    let sq = sqKing + delta;
    while (IN_BOARD[sq]) {
      const pc = pos.squares[sq];
      if (pc !== 0) {
        if (pc === sqOpp) {
          return true; // Opponent king
        }
        break;
      }
      sq += delta;
    }
  }

  // 2. Check for knight attacks
  for (let dir = 0; dir < 4; dir++) {
    for (const delta of KNIGHT_CHECK_DELTA[dir]) {
      const sqSrc = sqKing + delta;
      if (!IN_BOARD[sqSrc]) {
        continue;
      }
      const pc = pos.squares[sqSrc];
      if (pc !== sqOpp + 3) {
        continue; // Not opponent horse
      }
      // Verify leg is empty
      const pin = KNIGHT_PIN[sqKing - sqSrc + 256];
      if (pos.squares[sqSrc + pin] === 0) {
        return true;
      }
    }
  }

  // 3. Check for chariot/cannon attacks (orthogonal directions)
  for (const delta of KING_DELTA) {
    let sq = sqKing + delta;
    let cannon = false; // Whether we've crossed a screen
    while (IN_BOARD[sq]) {
      const pc = pos.squares[sq];
      if (pc !== 0) {
        if (!cannon) {
          // Chariot threat (directly adjacent or unobstructed)
          if (pc === sqOpp + 4) {
            return true;
          }
          cannon = true;
        } else {
          // Cannon threat (crossed exactly one screen)
          if (pc === sqOpp + 5) {
            return true;
          }
          break;
        }
      }
      sq += delta;
    }
  }

  // 4. Check for soldier/pawn attacks
  const oppPawn = sqOpp + 6;
  const fwdDelta = pos.sdPlayer === 0 ? -16 : 16;
  // Forward attack
  let sqTest = sqKing + fwdDelta;
  if (IN_BOARD[sqTest] && pos.squares[sqTest] === oppPawn) {
    return true;
  }
  // Sideways (after crossing river)
  for (const delta of [-1, 1]) {
    sqTest = sqKing + delta;
    if (IN_BOARD[sqTest] && pos.squares[sqTest] === oppPawn) {
      return true;
    }
  }

  return false;
}
