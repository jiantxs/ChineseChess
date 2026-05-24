import { GameManager } from './gameManager';
import { PieceLayout } from './pieceLayout';
import { Side, PieceType } from './types';

const STANDARD_PIECES = [
  { id: 'r1', type: PieceType.CHARIOT, side: Side.RED, position: { row: 9, col: 0 } },
  { id: 'r2', type: PieceType.HORSE, side: Side.RED, position: { row: 9, col: 1 } },
  { id: 'r3', type: PieceType.ELEPHANT, side: Side.RED, position: { row: 9, col: 2 } },
  { id: 'r4', type: PieceType.ADVISOR, side: Side.RED, position: { row: 9, col: 3 } },
  { id: 'r5', type: PieceType.GENERAL, side: Side.RED, position: { row: 9, col: 4 } },
  { id: 'r6', type: PieceType.ADVISOR, side: Side.RED, position: { row: 9, col: 5 } },
  { id: 'r7', type: PieceType.ELEPHANT, side: Side.RED, position: { row: 9, col: 6 } },
  { id: 'r8', type: PieceType.HORSE, side: Side.RED, position: { row: 9, col: 7 } },
  { id: 'r9', type: PieceType.CHARIOT, side: Side.RED, position: { row: 9, col: 8 } },
  { id: 'r10', type: PieceType.CANNON, side: Side.RED, position: { row: 7, col: 1 } },
  { id: 'r11', type: PieceType.CANNON, side: Side.RED, position: { row: 7, col: 7 } },
  { id: 'r12', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 0 } },
  { id: 'r13', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 2 } },
  { id: 'r14', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 4 } },
  { id: 'r15', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 6 } },
  { id: 'r16', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 8 } },
  { id: 'b1', type: PieceType.CHARIOT, side: Side.BLACK, position: { row: 0, col: 0 } },
  { id: 'b2', type: PieceType.HORSE, side: Side.BLACK, position: { row: 0, col: 1 } },
  { id: 'b3', type: PieceType.ELEPHANT, side: Side.BLACK, position: { row: 0, col: 2 } },
  { id: 'b4', type: PieceType.ADVISOR, side: Side.BLACK, position: { row: 0, col: 3 } },
  { id: 'b5', type: PieceType.GENERAL, side: Side.BLACK, position: { row: 0, col: 4 } },
  { id: 'b6', type: PieceType.ADVISOR, side: Side.BLACK, position: { row: 0, col: 5 } },
  { id: 'b7', type: PieceType.ELEPHANT, side: Side.BLACK, position: { row: 0, col: 6 } },
  { id: 'b8', type: PieceType.HORSE, side: Side.BLACK, position: { row: 0, col: 7 } },
  { id: 'b9', type: PieceType.CHARIOT, side: Side.BLACK, position: { row: 0, col: 8 } },
  { id: 'b10', type: PieceType.CANNON, side: Side.BLACK, position: { row: 2, col: 1 } },
  { id: 'b11', type: PieceType.CANNON, side: Side.BLACK, position: { row: 2, col: 7 } },
  { id: 'b12', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 0 } },
  { id: 'b13', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 2 } },
  { id: 'b14', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 4 } },
  { id: 'b15', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 6 } },
  { id: 'b16', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 8 } },
];

export function runAITest(): void {
  console.log('=== AI Engine Test ===');

  const gm = new GameManager();
  const layout = new PieceLayout(STANDARD_PIECES, Side.RED, 'standard');
  const game = gm.createGame(layout, false);
  console.log('Game created:', game.id);

  const humanPlayer = gm.joinGame(game.id, 'human-player', Side.RED);
  if (!humanPlayer) {
    console.error('Failed to join as human player');
    return;
  }
  console.log('Human player joined as RED');

  const aiPlayer = gm.joinGame(game.id, 'ai-player', Side.BLACK);
  if (!aiPlayer) {
    console.error('Failed to join as AI player');
    return;
  }
  console.log('AI player joined as BLACK');

  const humanMove = gm.makeMove(
    game.id,
    'human-player',
    { row: 7, col: 1 },
    { row: 7, col: 4 }
  );

  if (!humanMove.success) {
    console.error('Human move failed:', humanMove.error);
    return;
  }
  console.log('Human move: 炮从 (7,1) 到 (7,4)');
  console.log('Current turn after human move:', humanMove.game?.currentTurn);

  const aiMove = gm.makeAIMove(game.id);
  if (!aiMove.success) {
    console.error('AI move failed:', aiMove.error);
    return;
  }
  console.log('AI move successful!');
  console.log('Current turn after AI move:', aiMove.game?.currentTurn);

  const currentGame = gm.getGame(game.id);
  if (!currentGame) {
    console.error('Game not found after AI move');
    return;
  }

  console.log('Total moves:', currentGame.moves.length);
  console.log('Last move:', currentGame.moves[currentGame.moves.length - 1]);
  console.log('Game status:', currentGame.status);

  console.log('=== AI Engine Test Complete ===');
}

if (require.main === module) {
  runAITest();
}
