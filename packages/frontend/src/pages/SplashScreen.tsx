import { useState, useCallback } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onEnter: () => void;
}

/**
 * 闪屏界面。
 * 显示闪烁白字"点击以开始游戏"，点击后淡出并触发 onEnter。
 */
export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  const handleClick = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      onEnter();
    }, 1000);
  }, [fading, onEnter]);

  return (
    <div className={`splash-overlay ${fading ? 'splash-fade-out' : ''}`} onClick={handleClick}>
      {/* 复用菜单的动态背景 */}
      <div className="background-layer splash-bg" />
      <span className="splash-text">点击以开始游戏</span>
    </div>
  );
}