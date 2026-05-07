import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Piece,
  Side,
  Position,
  GameStatus,
  BOARD_ROWS,
  BOARD_COLS,
} from '@chess/core';
import './ChessBoard.css';

interface ChessBoardProps {
  gameState: GameState | null;
  playerSide: Side | null;
  gameMode: 'local' | 'online';
  onMove: (from: Position, to: Position) => void;
}

const PIECE_SIZE = 60;
const BOARD_PADDING = 35;
const CELL_SIZE = 55;

const PIECE_IMAGES: Record<string, HTMLImageElement> = {};
let imagesLoaded = false;

function loadPieceImages(): Promise<void> {
  if (imagesLoaded) return Promise.resolve();
  
  const pieces = [
    'red-general', 'red-advisor', 'red-elephant', 'red-horse', 
    'red-chariot', 'red-cannon', 'red-soldier',
    'black-general', 'black-advisor', 'black-elephant', 'black-horse',
    'black-chariot', 'black-cannon', 'black-soldier'
  ];
  
  const promises = pieces.map(name => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Failed to load piece image: ${name}`);
        resolve();
      };
      img.src = `./assets/svg/${name}.svg`;
      PIECE_IMAGES[name] = img;
    });
  });
  
  return Promise.all(promises).then(() => {
    imagesLoaded = true;
  });
}

function getPieceImageName(piece: Piece): string {
  return `${piece.side}-${piece.type}`;
}

export default function ChessBoard({ gameState, playerSide, gameMode, onMove }: ChessBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    loadPieceImages().then(() => setImagesReady(true));
  }, []);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesReady) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = BOARD_PADDING * 2 + CELL_SIZE * (BOARD_COLS - 1);
    const height = BOARD_PADDING * 2 + CELL_SIZE * (BOARD_ROWS - 1);
    
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#f4e4c1';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;

    for (let row = 0; row < BOARD_ROWS; row++) {
      const y = BOARD_PADDING + row * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(BOARD_PADDING, y);
      ctx.lineTo(BOARD_PADDING + (BOARD_COLS - 1) * CELL_SIZE, y);
      ctx.stroke();
    }

    for (let col = 0; col < BOARD_COLS; col++) {
      const x = BOARD_PADDING + col * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, BOARD_PADDING);
      ctx.lineTo(x, BOARD_PADDING + 4 * CELL_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, BOARD_PADDING + 5 * CELL_SIZE);
      ctx.lineTo(x, BOARD_PADDING + (BOARD_ROWS - 1) * CELL_SIZE);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(BOARD_PADDING + 3 * CELL_SIZE, BOARD_PADDING);
    ctx.lineTo(BOARD_PADDING + 5 * CELL_SIZE, BOARD_PADDING + 2 * CELL_SIZE);
    ctx.moveTo(BOARD_PADDING + 5 * CELL_SIZE, BOARD_PADDING);
    ctx.lineTo(BOARD_PADDING + 3 * CELL_SIZE, BOARD_PADDING + 2 * CELL_SIZE);
    ctx.moveTo(BOARD_PADDING + 3 * CELL_SIZE, BOARD_PADDING + 7 * CELL_SIZE);
    ctx.lineTo(BOARD_PADDING + 5 * CELL_SIZE, BOARD_PADDING + 9 * CELL_SIZE);
    ctx.moveTo(BOARD_PADDING + 5 * CELL_SIZE, BOARD_PADDING + 7 * CELL_SIZE);
    ctx.lineTo(BOARD_PADDING + 3 * CELL_SIZE, BOARD_PADDING + 9 * CELL_SIZE);
    ctx.stroke();

    ctx.font = '20px KaiTi, STKaiti, serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('楚 河', BOARD_PADDING + 2 * CELL_SIZE, BOARD_PADDING + 4.7 * CELL_SIZE);
    ctx.fillText('汉 界', BOARD_PADDING + 6 * CELL_SIZE, BOARD_PADDING + 4.7 * CELL_SIZE);

    if (gameState?.board) {
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const piece = gameState.board[row][col];
          if (piece) {
            const x = BOARD_PADDING + col * CELL_SIZE - PIECE_SIZE / 2;
            const y = BOARD_PADDING + row * CELL_SIZE - PIECE_SIZE / 2;
            const imgName = getPieceImageName(piece);
            const img = PIECE_IMAGES[imgName];
            if (img) {
              ctx.drawImage(img, x, y, PIECE_SIZE, PIECE_SIZE);
            }
          }
        }
      }
    }

    if (selectedPiece) {
      const x = BOARD_PADDING + selectedPiece.col * CELL_SIZE;
      const y = BOARD_PADDING + selectedPiece.row * CELL_SIZE;
      
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, PIECE_SIZE / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, PIECE_SIZE / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (validMoves.length > 0) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
      for (const move of validMoves) {
        const x = BOARD_PADDING + move.col * CELL_SIZE;
        const y = BOARD_PADDING + move.row * CELL_SIZE;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (gameState?.status === GameStatus.FINISHED) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px KaiTi, STKaiti, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const winner = gameState.winner === Side.RED ? '红方胜利!' : '黑方胜利!';
      ctx.fillText(winner, width / 2, height / 2);
      
      ctx.font = '18px sans-serif';
      ctx.fillText('点击重新开始', width / 2, height / 2 + 50);
    }
  }, [gameState, selectedPiece, validMoves, imagesReady]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  const getPositionFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Position | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const col = Math.round((x - BOARD_PADDING) / CELL_SIZE);
    const row = Math.round((y - BOARD_PADDING) / CELL_SIZE);
    
    if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
      return { row, col };
    }
    
    return null;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || gameState.status === GameStatus.FINISHED) {
      if (gameState?.status === GameStatus.FINISHED) {
        return;
      }
      return;
    }

    const pos = getPositionFromEvent(e);
    if (!pos) return;

    const piece = gameState.board[pos.row][pos.col];

    if (selectedPiece) {
      const isValidMove = validMoves.some(m => m.row === pos.row && m.col === pos.col);
      
      if (isValidMove) {
        onMove(selectedPiece, pos);
        setSelectedPiece(null);
        setValidMoves([]);
        return;
      }
    }

    if (piece) {
      const isMyTurn = gameState.currentTurn === piece.side;
      const canControl = gameMode === 'local' || playerSide === piece.side;

      if (isMyTurn && canControl) {
        setSelectedPiece(pos);
        const allPositions: Position[] = [];
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            allPositions.push({ row, col });
          }
        }
        setValidMoves(allPositions);
      } else {
        setSelectedPiece(null);
        setValidMoves([]);
      }
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }, [gameState, selectedPiece, validMoves, gameMode, playerSide, onMove, getPositionFromEvent]);

  const width = BOARD_PADDING * 2 + CELL_SIZE * (BOARD_COLS - 1);
  const height = BOARD_PADDING * 2 + CELL_SIZE * (BOARD_ROWS - 1);

  return (
    <div className="chess-board">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
      />
    </div>
  );
}
