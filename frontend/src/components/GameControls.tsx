import { GameState, GameStatus } from '@shared/types';
import './GameControls.css';

interface GameControlsProps {
  gameState: GameState | null;
  onReset: () => void;
  gameMode: 'local' | 'online';
}

export default function GameControls({ gameState, onReset, gameMode }: GameControlsProps) {
  const moveCount = gameState?.moves.length || 0;
  const isGameOver = gameState?.status === GameStatus.FINISHED;
  const isWaiting = gameState?.status === GameStatus.WAITING;

  return (
    <div className="game-controls">
      <div className="game-status">
        {isWaiting && gameMode === 'online' && (
          <div className="status-message waiting">等待对手加入...</div>
        )}
        {isGameOver && (
          <div className="status-message game-over">
            游戏结束 - {gameState?.winner === 'red' ? '红方' : '黑方'}胜利!
          </div>
        )}
        {!isWaiting && !isGameOver && gameState && (
          <div className="status-message playing">进行中 - 已走 {moveCount} 步</div>
        )}
      </div>

      <div className="control-buttons">
        <button className="control-btn reset" onClick={onReset}>
          {isGameOver ? '再来一局' : '返回菜单'}
        </button>
      </div>

      {gameMode === 'online' && gameState && (
        <div className="room-info">
          <span>房间号: {gameState.id}</span>
        </div>
      )}
    </div>
  );
}
