# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-08
**Commit:** 1bfa404
**Branch:** master

## OVERVIEW
Chinese Chess (Xiangqi) pnpm monorepo with Express/WebSocket backend and React/Vite frontend. Real-time multiplayer via WebSocket, local hot-seat play, in-memory game state (no DB).

## STRUCTURE
```
./
├── packages/
│   ├── core/          # Game logic, types, PieceLayout, GameLogger
│   ├── config/        # Runtime configuration with env overrides
│   ├── logger/        # Winston-based request/error/event logging
│   ├── game-records/  # Layout registry (standard Xiangqi)
│   ├── backend/       # Express + WebSocket server
│   └── frontend/      # React UI + hooks + BoardController
├── logs/              # Request/error/game logs
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Chess rules/move validation | packages/core/src/gameLogic.ts | isValidMove dispatches to piece-type validators |
| Game state manager | packages/core/src/gameManager.ts | Singleton, in-memory Map, player→game mapping |
| Piece layout/helper | packages/core/src/pieceLayout.ts | Board initialization, JSON serialization |
| In-memory game logger | packages/core/src/gameLogger.ts | GameLogger class, JSON export, game replay |
| Types/enums/constants | packages/core/src/types.ts | PieceType, Side, GameState, MessageType, INITIAL_BOARD |
| WebSocket server | packages/backend/src/services/gameServer.ts | /ws path, 30s ping, 10min cleanup |
| REST API routes | packages/backend/src/routes/ | game.ts (player-id), admin.ts (logs/games), config.ts (layouts) |
| React UI + mode switching | packages/frontend/src/App.tsx | Local vs online, Chinese labels |
| WebSocket client | packages/frontend/src/hooks/useGameSocket.ts | connect/joinGame/makeMove/getValidMoves |
| Board controller | packages/frontend/src/controllers/BoardController.ts | Class-based piece selection state |
| Canvas board rendering | packages/frontend/src/components/ChessBoard.tsx | SVG piece images, valid move dots |
| Config schema | packages/config/src/index.ts | ChessConfig interface, env overrides |
| Winston logging | packages/logger/src/index.ts | requestLogger, errorLogger, globalEventLogger |
| Layout registry | packages/game-records/src/index.ts | getLayout, getAllLayouts, standard layout |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| GameManager | class | core/src/gameManager.ts | 2 | In-memory game state, singleton |
| GameServer | class | backend/src/services/gameServer.ts | 1 | WebSocket handling, player state |
| isValidMove | function | core/src/gameLogic.ts | 2 | Move validation dispatcher |
| isGeneralCaptured | function | core/src/gameLogic.ts | 1 | Check win condition |
| getValidMoves | function | core/src/gameLogic.ts | 1 | Get all valid moves for piece |
| PieceLayout | class | core/src/pieceLayout.ts | 2 | Board layout helper |
| GameLogger | class | core/src/gameLogger.ts | 1 | In-memory game event logging |
| chessConfig | object | config/index.ts | 5 | Runtime config with env overrides |
| requestLogger | object | logger/index.ts | 2 | HTTP request logs |
| BoardController | class | frontend/src/controllers/BoardController.ts | 1 | Piece selection state |

## CONVENTIONS
- TypeScript strict mode across all packages
- pnpm workspace with `workspace:*` internal refs
- Vite builds to `backend/public` (single Express serves frontend)
- Frontend path aliases: `@chess/core`, `@chess/config`, `@chess/logger`, `@chess/game-records`
- WebSocket path: `/ws?playerId=xxx`
- Session-based player identity via `/api/game/player-id`
- `ts-node-dev` for hot-reload backend dev

## ANTI-PATTERNS (THIS PROJECT)
- **NO TEST INFRASTRUCTURE** - No jest/vitest config, no test dirs, no test scripts
- **NO CI/CD** - No GitHub Actions, no Docker, no containerization
- **No ESLint config** - eslint deps installed but no .eslintrc
- **NO DATABASE** - Game state in memory only; 1hr cleanup for finished games

## UNIQUE STYLES
- Game state in memory via GameManager.games Map; 1hr cleanup
- Frontend and backend dev servers run concurrently via `concurrently`
- Canvas-rendered board with SVG piece images loaded at runtime
- Two identical boards rendered side-by-side for hot-seat view
- BoardController class pattern (not typical React hooks)
- Layout registry system for pre-defined board setups
- Winston daily-rotate logs: logs/{requests,errors,events,games}/

## COMMANDS
```bash
pnpm dev              # Start backend (3000) + frontend (5173)
pnpm build            # Build all packages
pnpm typecheck        # Type-check all packages
pnpm start            # Run compiled backend only
```

## NOTES
- Backend tsconfig rootDir is `..` → output is `backend/dist/backend/src/`
- React 19, Express 4, WebSocket (ws 8.16), Winston logging
- AI not implemented (returns "AI not yet implemented" if ENABLE_AI=true)
- Message types: JOIN_GAME, MAKE_MOVE, LEAVE_GAME, GET_VALID_MOVES, VALID_MOVES (new)