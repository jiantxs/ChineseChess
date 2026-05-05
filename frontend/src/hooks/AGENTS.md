# frontend/src/hooks/ — Game State Hooks

**React hooks for local and online game modes.**

## FILES
- `useLocalGame.ts` — Hot-seat (single device) game logic
- `useGameSocket.ts` — WebSocket connection management

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Local game state | `useLocalGame.ts` `gameState` |
| Online game state | `useGameSocket.ts` `gameState` |
| WebSocket connect | `useGameSocket.ts` `connect()` |
| Player ID persistence | `useGameSocket.ts` `getPlayerId()` |

## CONVENTIONS
- **Local mode**: `useLocalGame` initializes board, tracks turn, validates moves client-side
- **Online mode**: `useGameSocket` manages WebSocket, auto-reconnect (3s), session playerId
- **Mode switching**: Controlled via `gameMode` state in App.tsx

## ANTI-PATTERNS
- **NEVER** call `isValidMove` without cloning board first
- **NEVER** store WebSocket state in React state — use refs

## STATE SHAPE
```typescript
interface GameState {
  id: string;
  board: (Piece | null)[][];
  currentTurn: Side;
  moves: Move[];
  status: GameStatus;
  winner?: Side;
}
```

## ONLINE CONNECTION
- Protocol: `ws://` or `wss://` based on page protocol
- Player ID: generated via `/api/game/player-id` (express-session) or fallback timestamp
- Reconnect: 3s delay, unlimited retries

## NOTES
- `useLocalGame` creates board from `INITIAL_BOARD` on mount
- `useGameSocket` sends `playerId` as URL query param
- Both hooks return same interface shape for interchangeable use in ChessBoard