import { HASH_SIZE, MATE_VALUE } from './constants';

export const HASH_ALPHA = 1;
export const HASH_BETA = 2;
export const HASH_EXACT = 3;

const HASH_MASK = HASH_SIZE - 1;

export class HashTable {
  private _key: Int32Array;
  private _lock: Int32Array;
  private _depth: Int8Array;
  private _flag: Int8Array;
  private _vl: Int16Array;
  private _mv: Int32Array;

  constructor() {
    this._key = new Int32Array(HASH_SIZE);
    this._lock = new Int32Array(HASH_SIZE);
    this._depth = new Int8Array(HASH_SIZE);
    this._flag = new Int8Array(HASH_SIZE);
    this._vl = new Int16Array(HASH_SIZE);
    this._mv = new Int32Array(HASH_SIZE);
  }

  clear(): void {
    this._key.fill(0);
    this._lock.fill(0);
    this._depth.fill(0);
    this._flag.fill(0);
    this._vl.fill(0);
    this._mv.fill(0);
  }

  private _adjustVlStore(vl: number, distance: number): number {
    if (vl > MATE_VALUE - 100) {
      return vl + distance;
    }
    if (vl < -(MATE_VALUE - 100)) {
      return vl - distance;
    }
    return vl;
  }

  private _adjustVlLoad(vl: number, distance: number): number {
    if (vl > MATE_VALUE - 100) {
      return vl - distance;
    }
    if (vl < -(MATE_VALUE - 100)) {
      return vl + distance;
    }
    return vl;
  }

  set(
    key: number,
    lock: number,
    depth: number,
    flag: number,
    vl: number,
    mv: number,
    distance: number
  ): void {
    const index = key & HASH_MASK;
    if (depth >= this._depth[index]) {
      this._key[index] = key;
      this._lock[index] = lock;
      this._depth[index] = depth;
      this._flag[index] = flag;
      this._vl[index] = this._adjustVlStore(vl, distance);
      this._mv[index] = mv;
    }
  }

  get(
    key: number,
    lock: number,
    depth: number,
    alpha: number,
    beta: number,
    distance: number
  ): { hit: boolean; vl: number; mv: number } {
    const index = key & HASH_MASK;
    if (this._key[index] === key && this._lock[index] === lock) {
      const storedDepth = this._depth[index];
      if (storedDepth >= depth) {
        const vl = this._adjustVlLoad(this._vl[index], distance);
        const flag = this._flag[index];
        if (flag === HASH_EXACT) {
          return { hit: true, vl, mv: this._mv[index] };
        }
        if (flag === HASH_ALPHA && vl <= alpha) {
          return { hit: true, vl: alpha, mv: this._mv[index] };
        }
        if (flag === HASH_BETA && vl >= beta) {
          return { hit: true, vl: beta, mv: this._mv[index] };
        }
      }
    }
    return { hit: false, vl: 0, mv: this._mv[index] };
  }
}
