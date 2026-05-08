import { PieceLayout } from '../packages/core/src/pieceLayout.js';
import { standardLayoutData } from './standard-layout.js';
export const gameLayouts = {
    standard: PieceLayout.fromJSON(standardLayoutData),
};
export function getLayout(name) {
    return gameLayouts[name];
}
export function getAllLayoutNames() {
    return Object.keys(gameLayouts);
}
//# sourceMappingURL=index.js.map