import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetPath } from '../utils/api';
import { clientLogger } from '../utils/clientLogger';
import './MenuScreen.css';

const BGM_PATH = assetPath('/assets/music/main_bgm.mp3');

interface MenuScreenProps {
  error?: string | null;
}

export default function MenuScreen({ error }: MenuScreenProps) {
  const navigate = useNavigate();
  const gameIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const audio = new Audio(BGM_PATH);
    audio.loop = true;
    audio.play().catch((err) => clientLogger.warn('BGM play failed', { error: err.message }));
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const handleStartLocal = useCallback(() => {
    clientLogger.info('Menu: start local game');
    navigate('/game/local');
  }, [navigate]);

  const handleStartLocal3D = useCallback(() => {
    clientLogger.info('Menu: start local 3D game');
    navigate('/game/local3d');
  }, [navigate]);

  const handleStartOnline = useCallback(() => {
    clientLogger.info('Menu: start online game');
    navigate('/game/online');
  }, [navigate]);

  const handleJoinGame = useCallback(() => {
    const input = gameIdInputRef.current;
    if (input?.value) {
      clientLogger.info('Menu: join game', { gameId: input.value });
      navigate(`/game/join/${input.value}`);
    }
  }, [navigate]);

  const handleViewLogs = useCallback(() => {
    clientLogger.info('Menu: view logs');
    navigate('/logs');
  }, [navigate]);

  const handleExit = useCallback(async () => {
    try {
      await fetch(assetPath('/api/game/exit'), { method: 'POST' });
    } catch (err) {
      clientLogger.error('Exit button error', { error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  return (
    <div className="app menu-app">
      <div className="background-layer" />
      <div className="scanlines" />
      <div className="menu-container">
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
          <button className="menu-btn" onClick={handleStartLocal}>
            <span className="btn-line" />
            <span className="btn-text">单机对战</span>
          </button>

          <button className="menu-btn" onClick={handleStartLocal3D}>
            <span className="btn-line" />
            <span className="btn-text">3D 单机对战</span>
          </button>

          <button className="menu-btn" onClick={handleStartOnline}>
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
                  handleJoinGame();
                }
              }}
            />
            <button className="menu-btn" onClick={handleJoinGame}>
              <span className="btn-line" />
              <span className="btn-text">加入房间</span>
            </button>
          </div>

          <button className="menu-btn" onClick={handleViewLogs}>
            <span className="btn-line" />
            <span className="btn-text">查看日志</span>
          </button>

          <button className="menu-btn exit-btn" onClick={handleExit}>
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
