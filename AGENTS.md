# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-07
**Commit:** c6a6b92
**Branch:** master

## OVERVIEW
Chinese Chess (Xiangqi) pnpm monorepo with Express/WebSocket backend and React/Vite frontend. Real-time multiplayer via WebSocket, local hot-seat play, in-memory game state (no DB).

## STRUCTURE
```
./
├── packages/
│   ├── core/          # Game logic, types, board state
│   ├── config/        # Runtime configuration
│   ├── backend/       # Express + WebSocket server
│   └── frontend/      # React UI + hooks
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Chess rules/move validation | packages/core/src/gameLogic.ts | All piece move checks |
| Game state types | packages/core/src/types.ts | Board, Piece, Position, Move |
| WebSocket server | packages/backend/src/services/gameServer.ts | Real-time game events |
| REST API routes | packages/backend/src/routes/admin.ts, game.ts | Player/Game endpoints |
| React UI | packages/frontend/src/App.tsx | Mode switching local/online |
| WebSocket hooks | packages/frontend/src/hooks/useGameSocket.ts | Online game client |
| Config schema | packages/config/src/index.ts | Environment overrides |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| GameManager | class | core/src/gameManager.ts | 2 | In-memory game state, player→game mapping |
| GameServer | class | backend/src/services/gameServer.ts | 1 | WebSocket connection handling |
| isValidMove | function | core/src/gameLogic.ts | 2 | Move validation for all piece types |
| chessConfig | object | config/index.ts | 3 | Runtime config with env overrides |

## CONVENTIONS
- TypeScript strict mode across all packages
- pnpm workspace with `workspace:*` internal refs
- Vite builds to backend/public (serves from single Express server)
- Frontend uses path aliases: `@chess/core`, `@chess/config`

## ANTI-PATTERNS (THIS PROJECT)
- **NO TEST INFRASTRUCTURE** - No jest/vitest config, no test dirs, no test scripts
- **NO CI/CD** - No GitHub Actions, no Docker, no containerization
- **No ESLint config** - eslint deps installed but no .eslintrc

## UNIQUE STYLES
- Game state in memory only; 1hr cleanup for finished games
- Frontend and backend dev servers run concurrently via `concurrently`
- WebSocket path: `/ws?playerId=xxx`
- Session-based player identity via `/api/game/player-id`
- `ts-node-dev` for hot-reload backend dev

## COMMANDS
```bash
pnpm dev              # Start backend (3000) + frontend (5173)
pnpm build            # Build both packages
pnpm typecheck        # Type-check all packages
pnpm start            # Run compiled backend only
```

## NOTES
- Backend tsconfig rootDir is `..` → output is `backend/dist/backend/src/`
- React 19, Express 4, WebSocket (ws 8.16), Winston logging
- AI not implemented (returns "AI not yet implemented" error if ENABLE_AI=true)