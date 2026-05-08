# packages/core

## OVERVIEW
Pure Chinese Chess game logic and in-memory state management. No external dependencies.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Move validation | src/gameLogic.ts | 288 lines, isValidMove dispatches to piece-type validators |
| Type definitions | src/types.ts | Piece, Position, GameState, Move, all enums, INITIAL_BOARD |
| Game state manager | src/gameManager.ts | createGame, joinGame, makeMove, in-memory Map storage |
| Piece layout helper | src/pieceLayout.ts | PieceLayout class, JSON serialization for layouts |
| In-memory game logger | src/gameLogger.ts | GameLogger class, JSON export, game replay |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| isValidMove | function | gameLogic.ts | Validates all piece moves, calls piece-type-specific helpers |
| isGeneralCaptured | function | gameLogic.ts | Returns { captured, winner? } after board change |
| getValidMoves | function | gameLogic.ts | Scans board for all valid destinations of a piece |
| GameManager | class | gameManager.ts | In-memory game state, player->game mapping, cleanup |
| PieceLayout | class | pieceLayout.ts | Board layout helper, JSON serialize/deserialize |
| INITIAL_BOARD | constant | types.ts | 32-piece starting positions |
| BOARD_ROWS, BOARD_COLS | constants | types.ts | 10, 9 |

## CONVENTIONS
- Pure functions for move validation (no side effects)
- Board: `(Piece | null)[][]` with row 0 = black home
- Position: `{ row: number, col: number }` (not { x, y })
- GameState.board is mutable for performance; clone only where needed
- Sides: `Side.RED` (先手), `Side.BLACK`
- MessageType includes GET_VALID_MOVES, VALID_MOVES (new message types)

## ANTI-PATTERNS
- **NO TEST INFRASTRUCTURE** in this package
- No database, no persistence; all state in memory via GameManager.games Map
- GameManager cleanupInactiveGames must be called externally (not self-scheduled)