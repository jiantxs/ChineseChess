import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreference, updatePreference, type UserPreference } from '../utils/preferenceApi';
import { clientLogger } from '../utils/clientLogger';
import './SettingsPage.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 本地编辑状态
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(100);

  // 加载偏好设置
  const loadPreference = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prefs = await getPreference();
      setPreference(prefs);
      setBgmEnabled(prefs.bgmEnabled);
      setBgmVolume(prefs.bgmVolume);
      clientLogger.info('Settings: preference loaded', { bgmEnabled: prefs.bgmEnabled, bgmVolume: prefs.bgmVolume });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载偏好设置失败';
      setError(message);
      clientLogger.error('Settings: failed to load preference', { error: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  // 自动保存偏好设置
  const autoSave = useCallback(async (enabled: boolean, volume: number) => {
    setSaveStatus('保存中...');
    setError(null);
    
    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // 防抖保存
    saveTimerRef.current = setTimeout(async () => {
      try {
        const updates: Partial<UserPreference> = {
          bgmEnabled: enabled,
          bgmVolume: volume,
        };
        const updated = await updatePreference(updates);
        setPreference(updated);
        setSaveStatus('已保存');
        clientLogger.info('Settings: auto-saved preference', { bgmEnabled: updated.bgmEnabled, bgmVolume: updated.bgmVolume });
        
        // 2秒后清除状态
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存偏好设置失败';
        setError(message);
        setSaveStatus('保存失败');
        clientLogger.error('Settings: failed to auto-save preference', { error: message });
      }
    }, 300);
  }, []);

  // 处理开关变化
  const handleBgmToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setBgmEnabled(newValue);
    autoSave(newValue, bgmVolume);
  }, [bgmVolume, autoSave]);

  // 处理音量变化
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setBgmVolume(newValue);
    autoSave(bgmEnabled, newValue);
  }, [bgmEnabled, autoSave]);

  // 应用并刷新
  const handleApply = useCallback(async () => {
    setSaveStatus('应用中...');
    setError(null);
    try {
      const updates: Partial<UserPreference> = {
        bgmEnabled,
        bgmVolume,
      };
      await updatePreference(updates);
      clientLogger.info('Settings: preference applied, reloading...');
      // 重新加载页面
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : '应用偏好设置失败';
      setError(message);
      setSaveStatus('应用失败');
      clientLogger.error('Settings: failed to apply preference', { error: message });
    }
  }, [bgmEnabled, bgmVolume]);

  // 返回菜单
  const handleBack = useCallback(() => {
    navigate('/menu');
  }, [navigate]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="settings-page">
        <div className="background-layer settings-bg" />
        <div className="settings-container">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="background-layer settings-bg" />

      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">设置</h1>
          <div className="header-actions">
            {saveStatus && (
              <span className="save-status">{saveStatus}</span>
            )}
            <button className="back-btn" onClick={handleBack}>
              返回菜单
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        <div className="settings-content">
          <div className="settings-section">
            <h2 className="section-title">背景音乐</h2>
            
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">主界面音乐</span>
                <span className="setting-desc">播放背景音乐</span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={bgmEnabled}
                    onChange={handleBgmToggle}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="toggle-label">{bgmEnabled ? '开启' : '关闭'}</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">音量</span>
                <span className="setting-desc">调节背景音乐音量大小</span>
              </div>
              <div className="setting-control volume-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
                <span className="volume-value">{bgmVolume}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="apply-btn"
            onClick={handleApply}
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
