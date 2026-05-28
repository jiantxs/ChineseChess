import { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPath, assetPath } from '../utils/api';
import { clientLogger } from '../utils/clientLogger';
import { BgmControls } from '../types/GamePageProps';
import './MenuScreen.css';


export default function MenuScreen({ pauseBgm, resumeBgm, restartBgm }: BgmControls) {
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(apiPath('/api/config'));
        const data = await res.json();
        setPlatform(data.server?.platform ?? '');
      } catch (err) {
        clientLogger.error('Menu: failed to load config', {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    loadConfig();
  }, []);

useEffect(() => {
    async function loadPreference() {
      try {
        const { getPreference } = await import('../utils/preferenceApi');
        const prefs = await getPreference();
        clientLogger.info('App: preference loaded', { bgmEnabled: prefs.audio.bgm.enabled.value, bgmVolume: prefs.audio.bgm.volume.value });

        if(prefs.audio.bgm.enabled.value && resumeBgm) {
          resumeBgm();
        }
      } catch (err) {
        clientLogger.error('App: failed to load preference', { 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }
    
    // 延迟加载偏好，确保音频元素已初始化
    const timer = setTimeout(loadPreference, 100);
    return () => clearTimeout(timer);
  }, []);

  const navigate = useNavigate();
  const gameIdInputRef = useRef<HTMLInputElement>(null);

  const handleStartAI = useCallback(() => {
    clientLogger.info('Menu: start AI game');
    navigate('/gameTestServer/ai');
  }, [navigate]);

  const handleStartLocal = useCallback(() => {
    clientLogger.info('Menu: start local game');
    navigate('/gameTestServer/local');
  }, [navigate]);

  const handleStartLocal3D = useCallback(() => {
    clientLogger.info('Menu: start local 3D game');
    navigate('/gameTestServer/local3d');
  }, [navigate]);

  const handleStartOnline = useCallback(() => {
    clientLogger.info('Menu: start online game');
    navigate('/gameTestServer/online');
  }, [navigate]);

  const handleJoinGame = useCallback(() => {
    const input = gameIdInputRef.current;
    if (input?.value) {
      clientLogger.info('Menu: join game', { gameId: input.value });
      navigate(`/gameTestServer/join/${input.value}`);
    }
  }, [navigate]);

  const handleViewLogs = useCallback(() => {
    clientLogger.info('Menu: view logs');
    navigate('/logs');
  }, [navigate]);

  const handleSettings = useCallback(() => {
    clientLogger.info('Menu: open settings');
    navigate('/settings');
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

          <button className="menu-btn" onClick={handleStartAI}>
            <span className="btn-line" />
            <span className="btn-text">人机对战</span>
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

          <button className="menu-btn" onClick={handleSettings}>
            <span className="btn-line" />
            <span className="btn-text">设置</span>
          </button>

          {platform === 'win' && (
            <button className="menu-btn exit-btn" onClick={handleExit}>
              <span className="btn-line" />
              <span className="btn-text">退出游戏</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
