# packages/frontend

## OVERVIEW
React 19 + Vite Chinese Chess UI. Hot-seat local play and real-time multiplayer via WebSocket. Canvas-rendered board.

## STRUCTURE
```
src/
├── App.tsx              # Mode switching (local/online), Chinese UI labels
├── main.tsx             # React entry
├── components/
│   ├── ChessBoard.tsx   # Canvas rendering, piece selection, move validation UI
│   └── GameControls.tsx # Game controls component
└── hooks/
    ├── useGameSocket.ts # WebSocket client, game state sync
    └── useLocalGame.ts  # Hot-seat local play logic
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Mode switching | src/App.tsx | Local vs online selection |
| Board rendering | src/components/ChessBoard.tsx | Canvas-based, piece selection |
| WebSocket client | src/hooks/useGameSocket.ts | Real-time game sync |
| Local game logic | src/hooks/useLocalGame.ts | Hot-seat play without server |

## CONVENTIONS
- React 19 with TypeScript strict mode
- Vite builds to `backend/public` (single Express serves frontend)
- Chinese UI labels for pieces and controls
- Path aliases: `@chess/core`, `@chess/config`

## ANTI-PATTERNS
- **NO test infrastructure** - No jest/vitest, no test scripts
- No ESLint config (dependencies installed but no .eslintrc)