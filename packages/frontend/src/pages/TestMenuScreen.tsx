import { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPath, assetPath } from '../utils/api';
import { clientLogger } from '../utils/clientLogger';
import { BgmControls } from '../types/GamePageProps';
import { SciFiButton } from '../components/common';

export default function TestMenuScreen({ pauseBgm, resumeBgm, restartBgm }: BgmControls) {
  const [platform, setPlatform] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(apiPath('/api/config'));
        const data = await res.json();
        setPlatform(data.server?.platform ?? '');
      } catch (err) {
        clientLogger.error('TestMenu: failed to load config', {
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

  const navigate = useNavigate();
  const gameIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const calculateAdaptiveLayout = () => {
      const container = containerRef.current;
      if (!container) return;

      // 获取菜单内容实际高度（标题 + 分隔线 + 按钮区域）
      const menuButtons = container.querySelector('.menu-buttons') as HTMLElement;
      const title = container.querySelector('.sf-title') as HTMLElement;
      const divider = container.querySelector('.sf-divider') as HTMLElement;
      
      if (!menuButtons || !title || !divider) return;

      // 计算内容所需的最小高度
      const contentHeight = title.offsetHeight + divider.offsetHeight + menuButtons.offsetHeight + 80; // 80px for padding
      const availableHeight = window.innerHeight * 0.90;
      const availableWidth = window.innerWidth * 0.96;

      // 计算需要的缩放比例（基于高度）
      const heightScale = availableHeight / contentHeight;
      const widthScale = availableWidth / 420; // 420px 是容器基准宽度
      const scale = Math.min(heightScale, widthScale, 1);

      // 应用 CSS 变量来控制所有元素的大小
      if (scale >= 1) {
        // 重置为默认值
        container.style.setProperty('--menu-scale', '1');
        container.style.setProperty('--menu-padding', '56px 48px');
        container.style.setProperty('--menu-title-size', '52px');
        container.style.setProperty('--menu-title-spacing', '24px');
        container.style.setProperty('--menu-btn-padding', '18px 0');
        container.style.setProperty('--menu-btn-size', '17px');
        container.style.setProperty('--menu-btn-spacing', '6px');
        container.style.setProperty('--menu-input-padding', '14px 16px');
        container.style.setProperty('--menu-input-size', '15px');
        container.style.setProperty('--menu-compact-padding', '14px 24px');
        container.style.setProperty('--menu-compact-size', '15px');
        container.style.setProperty('--menu-divider-margin', '0 auto 32px auto');
        container.style.setProperty('--menu-corner-size', '24px');
      } else {
        // 根据缩放比例调整所有元素
        const clampedScale = Math.max(scale, 0.5); // 最小缩放 0.5，避免太小无法阅读
        container.style.setProperty('--menu-scale', String(clampedScale));
        container.style.setProperty('--menu-padding', `${Math.round(56 * clampedScale)}px ${Math.round(48 * clampedScale)}px`);
        container.style.setProperty('--menu-title-size', `${Math.round(52 * clampedScale)}px`);
        container.style.setProperty('--menu-title-spacing', `${Math.round(24 * clampedScale)}px`);
        container.style.setProperty('--menu-btn-padding', `${Math.round(18 * clampedScale)}px 0`);
        container.style.setProperty('--menu-btn-size', `${Math.max(12, Math.round(17 * clampedScale))}px`);
        container.style.setProperty('--menu-btn-spacing', `${Math.max(2, Math.round(6 * clampedScale))}px`);
        container.style.setProperty('--menu-input-padding', `${Math.round(14 * clampedScale)}px ${Math.round(16 * clampedScale)}px`);
        container.style.setProperty('--menu-input-size', `${Math.max(11, Math.round(15 * clampedScale))}px`);
        container.style.setProperty('--menu-compact-padding', `${Math.round(14 * clampedScale)}px ${Math.round(24 * clampedScale)}px`);
        container.style.setProperty('--menu-compact-size', `${Math.max(11, Math.round(15 * clampedScale))}px`);
        container.style.setProperty('--menu-divider-margin', `0 auto ${Math.round(32 * clampedScale)}px auto`);
        container.style.setProperty('--menu-corner-size', `${Math.round(24 * clampedScale)}px`);
      }
    };

    const timer = setTimeout(() => {
      calculateAdaptiveLayout();
    }, 100);

    window.addEventListener('resize', calculateAdaptiveLayout);
    window.addEventListener('orientationchange', calculateAdaptiveLayout);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateAdaptiveLayout);
      window.removeEventListener('orientationchange', calculateAdaptiveLayout);
    };
  }, []);

  const handleStartAI = useCallback(() => {
    clientLogger.info('TestMenu: start AI game');
    navigate('/gameTestServer/ai');
  }, [navigate]);

  const handleStartLocal = useCallback(() => {
    clientLogger.info('TestMenu: start local game');
    navigate('/gameTestServer/local');
  }, [navigate]);

  const handleStartLocal3D = useCallback(() => {
    clientLogger.info('TestMenu: start local 3D game');
    navigate('/gameTestServer/local3d');
  }, [navigate]);

  const handleStartOnline = useCallback(() => {
    clientLogger.info('TestMenu: start online game');
    navigate('/gameTestServer/online');
  }, [navigate]);

  const handleJoinGame = useCallback(() => {
    const input = gameIdInputRef.current;
    if (input?.value) {
      clientLogger.info('TestMenu: join game', { gameId: input.value });
      navigate(`/gameTestServer/join/${input.value}`);
    }
  }, [navigate]);

  const handleViewLogs = useCallback(() => {
    clientLogger.info('TestMenu: view logs');
    navigate('/logs');
  }, [navigate]);

  const handleSettings = useCallback(() => {
    clientLogger.info('TestMenu: open settings');
    navigate('/settings');
  }, [navigate]);

  const handleBackToMain = useCallback(() => {
    clientLogger.info('TestMenu: back to main menu');
    navigate('/menu');
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
      <div ref={containerRef} className="menu-layout__container">
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
          <SciFiButton onClick={handleStartLocal}>单机对战</SciFiButton>
          <SciFiButton onClick={handleStartAI}>人机对战</SciFiButton>
          <SciFiButton variant="primary" onClick={handleBackToMain}>返回主菜单</SciFiButton>
          <SciFiButton onClick={handleStartLocal3D}>3D 单机对战</SciFiButton>
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
          <SciFiButton onClick={handleViewLogs}>查看日志</SciFiButton>

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
