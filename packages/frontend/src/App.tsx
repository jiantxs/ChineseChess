import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import SplashScreen from './pages/SplashScreen';
import MenuScreen from './pages/MenuScreen';
import GamePage from './pages/GamePage';
import LogsPage from './pages/LogsPage';
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

  clientLogger.info('App mounted', { basename: getBasename() });
  return (
    <BrowserRouter basename={getBasename()}>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/menu" element={<MenuScreen pauseBgm={pauseBgm} resumeBgm={resumeBgm} restartBgm={restartBgm} />} />
        <Route path="/gameTestServer/:mode/:gameId?" element={<GamePage pauseBgm={pauseBgm} resumeBgm={resumeBgm} restartBgm={restartBgm} />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
