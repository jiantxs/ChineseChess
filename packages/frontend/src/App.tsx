import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import SplashScreen from './pages/SplashScreen';
import MenuScreen from './pages/MenuScreen';
import GamePage from './pages/GamePage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import { assetPath } from './utils/api';
import { clientLogger } from './utils/clientLogger';
import './App.css';

const BGM_PATH = assetPath('/assets/music/main_bgm.mp3');

function getBasename() {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/[^\/]+/);
  return match && match[0] !== '/' ? match[0] : '';
}

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(BGM_PATH);
    audioRef.current.loop = true;
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const pauseBgm = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resumeBgm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => clientLogger.warn('BGM resume failed', { error: err.message }));
    }
  }, []);

  const restartBgm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => clientLogger.warn('BGM restart failed', { error: err.message }));
    }
  }, []);

      // 加载并应用用户偏好设置
  useEffect(() => {
    async function loadPreference() {
      try {
        const { getPreference } = await import('./utils/preferenceApi');
        const prefs = await getPreference();
        clientLogger.info('App: preference loaded', {
          bgmEnabled: prefs.audio.bgm.enabled.value,
          bgmVolume: prefs.audio.bgm.volume.value
        });

        if (audioRef.current) {
          audioRef.current.volume = prefs.audio.bgm.volume.value / 100;
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

  clientLogger.info('App mounted', { basename: getBasename() });
  return (
    <BrowserRouter basename={getBasename()}>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/menu" element={<MenuScreen pauseBgm={pauseBgm} resumeBgm={resumeBgm} restartBgm={restartBgm} />} />
        <Route path="/gameTestServer/:mode/:gameId?" element={<GamePage pauseBgm={pauseBgm} resumeBgm={resumeBgm} restartBgm={restartBgm} />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
