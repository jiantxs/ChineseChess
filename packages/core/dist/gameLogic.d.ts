import { Piece, Side, Position } from './types';
export declare function isValidMove(board: (Piece | null)[][], piece: Piece, from: Position, to: Position): boolean;
export declare function isGeneralCaptured(board: (Piece | null)[][]): {
    captured: boolean;
    winner?: Side;
};
export declare function getValidMoves(board: (Piece | null)[][], piece: Piece): Position[];
//# sourceMappingURL=gameLogic.d.ts.map