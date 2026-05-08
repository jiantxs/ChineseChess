import { PieceLayout } from '../packages/core/src/pieceLayout.js';
import { standardLayoutData } from './standard-layout.js';

export const gameLayouts = {
  standard: PieceLayout.fromJSON(standardLayoutData),
} as const;

export type GameLayoutName = keyof typeof gameLayouts;

export function getLayout(name: GameLayoutName): PieceLayout {
  return gameLayouts[name];
}

export function getAllLayoutNames(): GameLayoutName[] {
  return Object.keys(gameLayouts) as GameLayoutName[];
}
