# packages/frontend

## OVERVIEW
React 19 + Vite Chinese Chess UI. Hot-seat local play and real-time multiplayer via WebSocket. Canvas-rendered board with SVG piece images.

## STRUCTURE
```
src/
├── App.tsx                   # Mode switching (local/online), Chinese UI labels
├── main.tsx                  # React entry
├── components/
│   ├── ChessBoard.tsx        # Canvas rendering, piece selection, valid move dots
│   └── GameControls.tsx      # Game controls component
├── controllers/
│   └── BoardController.ts    # Class-based piece selection state with subscriber pattern
└── hooks/
    ├── useGameSocket.ts      # WebSocket client: connect/joinGame/makeMove/getValidMoves
    └── useLocalGame.ts       # Hot-seat local play (wraps useGameSocket with local=true)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Mode switching | src/App.tsx | Local vs online selection, dual board rendering |
| Board rendering | src/components/ChessBoard.tsx | Canvas-based, SVG pieces from /assets/svg/ |
| WebSocket client | src/hooks/useGameSocket.ts | Real-time game sync, VALID_MOVES handling |
| Local game logic | src/hooks/useLocalGame.ts | Wraps useGameSocket for hot-seat play |
| Piece selection state | src/controllers/BoardController.ts | Class-based controller with useBoardController hook |

## CONVENTIONS
- React 19 with TypeScript strict mode
- Vite builds to `backend/public` (single Express serves frontend)
- Chinese UI labels for pieces and controls ("象棋", "本地对战", "创建在线房间")
- Path aliases: `@chess/core`, `@chess/config`
- Canvas-based board (not SVG/DOM chess pieces)
- Two identical boards rendered side-by-side for hot-seat view
- VALID_MOVES message type supported for move highlighting

## ANTI-PATTERNS
- **NO test infrastructure** - No jest/vitest, no test scripts
- No ESLint config (dependencies installed but no .eslintrc)
- BoardController instance stored in useRef without strict mode guard (double-instantiation in dev)