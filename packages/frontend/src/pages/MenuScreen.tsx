import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPath, assetPath } from '../utils/api';
import { clientLogger } from '../utils/clientLogger';
import { BgmControls } from '../types/GamePageProps';
import { SciFiButton } from '../components/common';

export default function MenuScreen({ pauseBgm, resumeBgm, restartBgm }: BgmControls) {
  const [platform, setPlatform] = useState<string>('');
  const navigate = useNavigate();
  const gameIdInputRef = useRef<HTMLInputElement>(null);

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

        if (prefs.audio.bgm.enabled.value && resumeBgm) {
          resumeBgm();
        }
      } catch (err) {
        clientLogger.error('App: failed to load preference', {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    const timer = setTimeout(loadPreference, 100);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="app menu-layout">
      <div className="menu-layout__container">
        <div className="sf-corner sf-corner--tl" />
        <div className="sf-corner sf-corner--tr" />
        <div className="sf-corner sf-corner--bl" />
        <div className="sf-corner sf-corner--br" />

        <h1 className="sf-title">
          <span className="title-char">象</span>
          <span className="title-char">棋</span>
        </h1>

        <div className="sf-divider" />

        <div className="menu-buttons">
          <SciFiButton onClick={handleStartAI}>人机对战</SciFiButton>
          <SciFiButton onClick={handleStartOnline}>开始联机</SciFiButton>

          <div className="join-section">
            <input
              ref={gameIdInputRef}
              type="text"
              placeholder="输入房间号"
              className="sf-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJoinGame();
                }
              }}
            />
            <SciFiButton size="compact" onClick={handleJoinGame}>
              加入房间
            </SciFiButton>
          </div>

          <SciFiButton onClick={handleSettings}>设置</SciFiButton>

          {platform === 'win' && (
            <SciFiButton variant="danger" onClick={handleExit}>
              退出游戏
            </SciFiButton>
          )}
        </div>
      </div>
    </div>
  );
}