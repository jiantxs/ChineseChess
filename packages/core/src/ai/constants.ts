export const MATE_VALUE = 10000;
export const BAN_VALUE = MATE_VALUE - 100;
export const WIN_VALUE = MATE_VALUE - 200;
export const DRAW_VALUE = 20;
export const ADVANCED_VALUE = 3;
export const NULL_OKAY_MARGIN = 200;
export const NULL_SAFE_MARGIN = 400;
export const MVV_VALUE: readonly [number, number, number, number, number, number, number] = [
  50, 10, 10, 30, 40, 30, 20,
];
export const LIMIT_DEPTH = 64;
export const HASH_SIZE = 1 << 20;