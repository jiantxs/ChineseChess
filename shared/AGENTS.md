# shared/ — Game Logic & Types

**Pure TypeScript, no runtime dependencies.**

## OVERVIEW
All game rules and type definitions shared between frontend (React) and backend (Express/WebSocket).

## FILES
- `types.ts` — Interfaces, enums, INITIAL_BOARD constant (32 pieces)
- `gameLogic.ts` — Pure move validation functions

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Piece/Board types | `types.ts` |
| Move validation | `gameLogic.ts` `isValidMove()` |
| Win condition | `gameLogic.ts` `isGeneralCaptured()` |
| Valid moves for a piece | `gameLogic.ts` `getValidMoves()` |

## CONVENTIONS
- **No side effects** — `gameLogic.ts` functions are pure
- **Board is 10×9** — rows 0-9 (black starts at 0), cols 0-8
- **Side enum**: `RED = 'red'`, `BLACK = 'black'`
- **Position**: `{ row: number, col: number }`

## PIECE MOVEMENT RULES (documented in code)
| Piece | Rule |
|-------|------|
| General | 1 step orthogonal within palace (rows 0-2 or 7-9, cols 3-5) |
| Advisor | 1 step diagonal within palace |
| Elephant | 2 steps diagonal, blocked by eye at midpoint, cannot cross river |
| Horse | L-shape (2+1 or 1+2), blocked by leg |
| Chariot | Any orthogonal distance, no blocking pieces |
| Cannon | Orthogonal, jumps exactly 1 piece to capture, none for empty |
| Soldier | Forward 1 (both sides), then diagonal after crossing river |

## ANTI-PATTERNS
- **NEVER** mutate the board directly — clone first: `board.map(row => [...row])`
- **NEVER** call gameLogic from gameServer — only from gameManager (backend) or hooks (frontend)

## NOTES
- `INITIAL_BOARD` constant defines starting positions — both backend and frontend use identical setup
- `wouldExposeGeneral()` checks flying general rule (generals cannot see each other)
