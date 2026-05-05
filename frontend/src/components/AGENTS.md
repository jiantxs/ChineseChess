# frontend/src/components/ — UI Components

**React + Canvas-based board rendering.**

## FILES
- `ChessBoard.tsx` — Canvas rendering, click handling, piece selection
- `ChessBoard.css` — Board styling
- `GameControls.tsx` — Reset/menu controls
- `GameControls.css` — Control styling

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Canvas rendering | `ChessBoard.tsx` `drawBoard()` |
| Click/piece selection | `ChessBoard.tsx` `handleCanvasClick()` |
| Valid move display | `ChessBoard.tsx` green dots on canvas |
| Win overlay | `ChessBoard.tsx` draws dark overlay + text |

## CONVENTIONS
- **Canvas-based** — not DOM elements for board/pieces
- **SVG sprites** — loaded from `/assets/svg/{side}-{type}.svg`
- **Chinese labels** — "楚 河", "汉 界", "红方", "黑方"
- **CELL_SIZE=55**, PIECE_SIZE=60, BOARD_PADDING=35

## PIECE RENDERING
```
getPieceImageName(piece) → `${piece.side}-${piece.type}`
// e.g., "red-general", "black-chariot"
```

## ANTI-PATTERNS
- **NEVER** render pieces as DOM — canvas only
- **NEVER** load images synchronously — use `loadPieceImages()` Promise

## NOTES
- Selected piece: gold circle outline (3px, #ffd700)
- Valid moves: green dots (rgba(0,255,0,0.4), radius 8)
- Board: #f4e4c1 background, #333 stroke
- Win screen: black overlay (0.6 opacity) + white text