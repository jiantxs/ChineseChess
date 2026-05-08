import { PieceLayout } from '../packages/core/src/pieceLayout.js';
export declare const gameLayouts: {
    readonly standard: PieceLayout;
};
export type GameLayoutName = keyof typeof gameLayouts;
export declare function getLayout(name: GameLayoutName): PieceLayout;
export declare function getAllLayoutNames(): GameLayoutName[];
//# sourceMappingURL=index.d.ts.map