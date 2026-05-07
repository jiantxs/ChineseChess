# packages/backend

## OVERVIEW
Express/WebSocket server handling real-time Chinese Chess multiplayer with REST admin endpoints and Winston logging.

## STRUCTURE
```
src/
├── index.ts              # Entry: Express app + HTTP server, GameManager init
├── routes/
│   ├── admin.ts         # Admin dashboard API (logs, live games, archived games)
│   └── game.ts           # POST /api/game/player-id (session-based player ID)
└── services/
    ├── gameServer.ts     # GameServer class, WebSocket on /ws, handles join_game/make_move/disconnect
    ├── logger.ts         # Winston request/error loggers with daily rotate
    └── gameLogger.ts     # GameLogger class, JSON game records to logs/games/{active,archive}
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Entry point | src/index.ts | Express app, HTTP server, session middleware |
| WebSocket server | src/services/gameServer.ts | GameServer class, path /ws |
| Admin REST API | src/routes/admin.ts | Basic auth, logs/games endpoints |
| Player ID endpoint | src/routes/game.ts | POST /api/game/player-id |
| Request/error logging | src/services/logger.ts | Winston with DailyRotateFile |
| Game record logging | src/services/gameLogger.ts | JSON records in logs/games/ |

## CONVENTIONS
- Express 4 + ws 8.16 WebSocket via `ws` library
- Session-based player identity via `/api/game/player-id`
- WebSocket path: `/ws?playerId=xxx`
- GameManager imported from `@chess/core`
- Winston daily rotate logs in `logs/requests/`, `logs/errors/`, `logs/games/`
- Admin routes require Basic auth (admin/<password from config>)
- 30s ping interval, 10min cleanup interval

## ANTI-PATTERNS
- **NO test infrastructure** - no jest/vitest config or test scripts
