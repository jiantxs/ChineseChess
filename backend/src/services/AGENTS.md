# backend/src/services/ — Game Server & State

**Express HTTP + WebSocket, in-memory game state.**

## OVERVIEW
Backend services layer: GameManager (state) + GameServer (WebSocket).

## FILES
- `gameManager.ts` — In-memory game state, move validation, player management
- `gameServer.ts` — WebSocket server, message routing, ping/pong

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Game creation/join | `gameManager.ts` `createGame()`, `joinGame()` |
| Move execution | `gameManager.ts` `makeMove()` |
| WebSocket handlers | `gameServer.ts` `handleJoinGame()`, `handleMakeMove()` |
| Message broadcasting | `gameServer.ts` `broadcastToGame()` |
| Cleanup old games | `gameManager.ts` `cleanupInactiveGames()` |

## CONVENTIONS
- **Games stored in Map** — `games: Map<string, GameState>`
- **Player→Game mapping** — `playerGames: Map<string, string>`
- **WebSocket path** — `/ws?playerId=xxx`
- **Ping interval** — 30s, disconnects if no pong
- **Game cleanup** — removes finished games after 1hr inactivity

## ANTI-PATTERNS
- **NEVER** use `backend/dist/` — it's auto-generated
- **NEVER** store games in files/DB — in-memory only (suitable for development)
- **NEVER** trust client-side validation — always re-validate in `makeMove()`

## MESSAGE TYPES
`JOIN_GAME`, `MAKE_MOVE`, `LEAVE_GAME`, `GAME_STATE`, `GAME_OVER`, `ERROR`, `PING`, `PONG`, `AI_MOVE`

## NOTES
- `gameServer.ts` sanitizes game state before sending to client (hides playerIds)
- Reconnect timeout: 30s grace period before marking player disconnected
- AI move handler exists but returns "not yet implemented"