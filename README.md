# 天天象棋 - Chinese Chess Online

A real-time Chinese Chess (Xiangqi) web application with WebSocket-based multiplayer and local hot-seat play, built with React + Vite frontend and Express + WebSocket backend.

## Features

- **Local Hot-Seat**: Two players on one device
- **Online Multiplayer**: Real-time games via WebSocket
- **Canvas Board**: Smooth rendering with SVG piece images
- **Game Layouts**: Standard Xiangqi initial setup ( extensible via layout registry)

## Quick Start

```bash
pnpm install
pnpm dev
```

- Backend: http://localhost:3000
- Frontend dev server: http://localhost:5173

## Project Structure

```
packages/
├── core/           # Game logic, types, PieceLayout, GameLogger
├── config/         # Runtime config (env overrides)
├── logger/         # Winston logging (request/error/event)
├── game-records/  # Layout registry (standard Xiangqi)
├── backend/       # Express + WebSocket server
└── frontend/      # React UI + hooks + BoardController
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start backend (3000) + frontend (5173) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm start` | Run compiled backend only |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `SESSION_SECRET` | (default key) | Session encryption key |
| `ENABLE_AI` | false | Enable AI opponent |
| `AI_ENDPOINT` | undefined | External AI service URL |
| `ADMIN_PASSWORD` | admin123 | Admin dashboard password |
| `LOG_LEVEL` | info | Logging level |
| `NODE_ENV` | development | Set to production |

## Architecture

- **Frontend**: React 19, Canvas-based board, class-based BoardController
- **Backend**: Express 4, ws 8.16 WebSocket, Winston logging
- **State**: In-memory via GameManager singleton (Map<gameId, GameState>)
- **Config**: ChessConfig interface with env override support
- **Logging**: Winston DailyRotateFile in logs/{requests,errors,events}/

## Game Modes

### Local (Hot-Seat)
- Both sides controlled on same device
- Two boards rendered side-by-side
- No server connection required after initial load

### Online
- WebSocket connection to `/ws?playerId=<playerId>`
- Create room or join via room ID
- Real-time sync across players

## Notes

- No test infrastructure (no jest/vitest)
- No CI/CD (no GitHub Actions/Docker)
- No database - game state is in-memory only
- 1 hour cleanup for finished games
- AI not yet implemented (returns error if ENABLE_AI=true)
