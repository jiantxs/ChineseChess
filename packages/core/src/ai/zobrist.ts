

const PIECE_SLOTS = 14;
const POSITION_COUNT = 256;

class RC4 {
  private s: number[] = [];
  private i = 0;
  private j = 0;

  constructor(key: number[]) {
    for (let n = 0; n < 256; n++) {
      this.s[n] = n;
    }
    let jj = 0;
    for (let n = 0; n < 256; n++) {
      jj = (jj + this.s[n] + key[n % key.length]) % 256;
      const tmp = this.s[n];
      this.s[n] = this.s[jj];
      this.s[jj] = tmp;
    }
  }

  nextByte(): number {
    this.i = (this.i + 1) % 256;
    this.j = (this.j + this.s[this.i]) % 256;
    const tmp = this.s[this.i];
    this.s[this.i] = this.s[this.j];
    this.s[this.j] = tmp;
    return this.s[(this.s[this.i] + this.s[this.j]) % 256];
  }

  nextLong(): number {
    this.nextByte();
    const b0 = this.nextByte();
    const b1 = this.nextByte();
    const b2 = this.nextByte();
    const b3 = this.nextByte();
    this.nextByte();
    return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }
}

export function zobristPcIdx(pc: number): number {
  if (pc >= 8 && pc <= 14) return pc - 8;
  if (pc >= 16 && pc <= 22) return pc - 16 + 7;
  return -1;
}

interface ZobristTables {
  playerKey: number;
  playerLock: number;
  keyTable: number[][];
  lockTable: number[][];
}

function initZobristTables(): ZobristTables {
  const rc4 = new RC4([0]);
  const playerKey = rc4.nextLong();
  const playerLock = rc4.nextLong();
  const keyTable: number[][] = [];
  const lockTable: number[][] = [];

  for (let piece = 0; piece < PIECE_SLOTS; piece++) {
    keyTable[piece] = [];
    lockTable[piece] = [];
    for (let pos = 0; pos < POSITION_COUNT; pos++) {
      keyTable[piece][pos] = rc4.nextLong();
      lockTable[piece][pos] = rc4.nextLong();
    }
  }
  return { playerKey, playerLock, keyTable, lockTable };
}

export const ZOBRIST: ZobristTables = initZobristTables();