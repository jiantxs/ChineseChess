import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreference, updatePreference, type UserPreference } from '../utils/preferenceApi';
import { PreferenceRenderer } from '../components/PreferenceRenderer';
import { clientLogger } from '../utils/clientLogger';
import './SettingsPage.css';

// 立即更新本地状态
function shallowMergePreference(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const baseValue = base[key];
    if (baseValue && typeof baseValue === 'object' && typeof value === 'object' && !Array.isArray(baseValue) && !Array.isArray(value)) {
      result[key] = shallowMergePreference(baseValue as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function deepMergePreference(base: UserPreference, overrides: Partial<UserPreference>): UserPreference {
  return shallowMergePreference(base as unknown as Record<string, unknown>, overrides as unknown as Record<string, unknown>) as unknown as UserPreference;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPreference = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prefs = await getPreference();
      setPreference(prefs);
      clientLogger.info('Settings: preference loaded');
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

  const handleChange = useCallback((updates: Partial<UserPreference>) => {
    // 立即更新本地状态，滑动条不用等上传
    setPreference((prev) => {
      if (!prev) return prev;
      return deepMergePreference(prev, updates);
    });

    setSaveStatus('保存中...');
    setError(null);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        const updated = await updatePreference(updates);
        setPreference(updated);
        setSaveStatus('已保存');
        clientLogger.info('Settings: auto-saved', updates);
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存偏好设置失败';
        setError(message);
        setSaveStatus('保存失败');
        clientLogger.error('Settings: failed to auto-save', { error: message });
      }
    }, 300);
  }, []);

  const handleApply = useCallback(async () => {
    if (!preference) return;
    setSaveStatus('应用中...');
    setError(null);
    try {
      await updatePreference(preference);
      clientLogger.info('Settings: preference applied, reloading...');
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : '应用偏好设置失败';
      setError(message);
      setSaveStatus('应用失败');
      clientLogger.error('Settings: failed to apply preference', { error: message });
    }
  }, [preference]);

  const handleBack = useCallback(() => {
    navigate('/menu');
  }, [navigate]);

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
            {saveStatus && <span className="save-status">{saveStatus}</span>}
            <button className="back-btn" onClick={handleBack}>返回菜单</button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {preference && (
          <PreferenceRenderer preference={preference} onChange={handleChange} />
        )}

        <div className="settings-actions">
          <button className="apply-btn" onClick={handleApply}>应用</button>
        </div>
      </div>
    </div>
  );
}