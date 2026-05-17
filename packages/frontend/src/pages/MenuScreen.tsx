import { useEffect, useRef, useCallback } from 'react';
import { assetPath } from '../utils/api';
import { clientLogger } from '../utils/clientLogger';
import './MenuScreen.css';

const BGM_PATH = assetPath('/assets/music/main_bgm.mp3');

interface MenuScreenProps {
  onStartLocal: () => void;
  onStartOnline: () => void;
  onJoinGame: (gameId: string) => void;
  onExit: () => void;
  error?: string | null;
}

/**
 * 主菜单界面。
 * 显示开始本地游戏、创建在线房间、加入已有房间的选项。
 */
export default function MenuScreen({ onStartLocal, onStartOnline, onJoinGame, onExit, error }: MenuScreenProps) {
  const gameIdInputRef = useRef<HTMLInputElement>(null);

  // 背景音乐控制
  useEffect(() => {
    const audio = new Audio(BGM_PATH);
    audio.loop = true;
    audio.play().catch((err) => clientLogger.warn('BGM play failed', { error: err.message }));
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const handleJoin = useCallback(() => {
    const input = gameIdInputRef.current;
    if (input?.value) onJoinGame(input.value);
  }, [onJoinGame]);

  return (
    <div className="app menu-app">
      {/* 动态背景图片 */}
      <div className="background-layer" />
      {/* 扫描线 overlay */}
      <div className="scanlines" />
      <div className="menu-container">
        {/* 面板四角装饰 */}
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        <h1 className="game-title">
          <span className="title-char">象</span>
          <span className="title-char">棋</span>
        </h1>

        <div className="menu-divider" />

        <div className="menu-buttons">
          <button className="menu-btn" onClick={onStartLocal}>
            <span className="btn-line" />
            <span className="btn-text">单机对战</span>
          </button>

          <button className="menu-btn" onClick={onStartOnline}>
            <span className="btn-line" />
            <span className="btn-text">开始联机</span>
          </button>

          <div className="join-section">
            <input
              ref={gameIdInputRef}
              type="text"
              placeholder="输入房间号"
              className="join-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJoin();
                }
              }}
            />
            <button className="menu-btn" onClick={handleJoin}>
              <span className="btn-line" />
              <span className="btn-text">加入房间</span>
            </button>
          </div>

          <button className="menu-btn exit-btn" onClick={onExit}>
            <span className="btn-line" />
            <span className="btn-text">退出游戏</span>
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}