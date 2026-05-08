# packages/backend

## OVERVIEW
Express/WebSocket server handling real-time Chinese Chess multiplayer with REST admin endpoints and Winston logging.

## STRUCTURE
```
src/
├── index.ts              # Entry: Express app + HTTP server, session middleware, static files
├── routes/
│   ├── admin.ts         # Admin dashboard API (logs, live games, archived games, Basic auth)
│   ├── game.ts          # POST /api/game/player-id (session-based player ID)
│   └── config.ts        # GET /api/config (server config, available layouts)
└── services/
    ├── gameServer.ts    # GameServer class, WebSocket on /ws, 30s ping, 10min cleanup
    └── logger.ts        # Winston request/error loggers with DailyRotateFile
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Entry point | src/index.ts | Express app, HTTP server, session middleware |
| WebSocket server | src/services/gameServer.ts | GameServer class, path /ws, handles all message types |
| Admin REST API | src/routes/admin.ts | Basic auth, logs/games/active/live endpoints |
| Player ID endpoint | src/routes/game.ts | POST /api/game/player-id |
| Config endpoint | src/routes/config.ts | GET /api/config with layout info |
| Request/error logging | src/services/logger.ts | Winston with DailyRotateFile |

## CONVENTIONS
- Express 4 + ws 8.16 WebSocket via `ws` library
- Session-based player identity via `/api/game/player-id`
- WebSocket path: `/ws?playerId=xxx` (required, 1008 if missing)
- GameManager imported from `@chess/core`
- Winston daily rotate logs in `logs/requests/`, `logs/errors/`, `logs/events/`
- Admin routes require Basic auth (`admin:<password from chessConfig>`)
- 30s ping interval, 10min cleanup interval (1hr game timeout)
- 30-second reconnect window before forfeit

## ANTI-PATTERNS
- **NO test infrastructure** - no jest/vitest config or test scripts
- Backend tsconfig rootDir is `..` → output at `backend/dist/backend/src/`
