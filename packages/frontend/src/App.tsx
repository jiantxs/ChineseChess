import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen';
import MenuScreen from './pages/MenuScreen';
import GamePage from './pages/GamePage';
import LogsPage from './pages/LogsPage';
import { clientLogger } from './utils/clientLogger';
import './App.css';

function getBasename() {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/[^\/]+/);
  return match && match[0] !== '/' ? match[0] : '';
}

function App() {
  clientLogger.info('App mounted', { basename: getBasename() });
  return (
    <BrowserRouter basename={getBasename()}>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/menu" element={<MenuScreen />} />
        <Route path="/game/:mode/:gameId?" element={<GamePage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
