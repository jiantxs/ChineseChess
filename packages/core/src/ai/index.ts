/*
该ai模块改编自https://github.com/SinuxLee/jschess.git，并进行了重构和优化以适应当前项目的架构和需求。
*/


import { Position } from './position';
import { Search } from './search';
import { boardToSquares, sqToPosition, moveSrc, moveDst } from './adapter';
import { Piece, Side } from '../types';

export interface AIMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  score: number;
}

export class AIEngine {
  private _pos: Position;
  private _search: Search;

  constructor() {
    this._pos = new Position();
    this._search = new Search(this._pos);
  }

  findBestMove(
    board: (Piece | null)[][],
    side: Side,
    maxDepth?: number,
    millis?: number
  ): AIMove | null {
    this._pos.fromBoard(board, side);

    const score = this._search.searchMain(maxDepth, millis);

    if (this._search.bestMove === 0) {
      return null;
    }

    const mv = this._search.bestMove;
    const srcSq = moveSrc(mv);
    const dstSq = moveDst(mv);

    return {
      from: sqToPosition(srcSq),
      to: sqToPosition(dstSq),
      score,
    };
  }
}
