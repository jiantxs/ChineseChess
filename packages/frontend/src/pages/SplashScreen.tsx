import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientLogger } from '../utils/clientLogger';
import './SplashScreen.css';

export default function SplashScreen() {
  const [fading, setFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    if (fading) return;
    clientLogger.info('SplashScreen clicked, navigating to menu');
    setFading(true);
    setTimeout(() => {
      navigate('/menu');
    }, 1000);
  }, [fading, navigate]);

  return (
    <div className={`splash-overlay ${fading ? 'splash-fade-out' : ''}`} onClick={handleClick}>
      <div className="background-layer splash-bg" />
      <span className="splash-text">点击以开始游戏</span>
    </div>
  );
}
