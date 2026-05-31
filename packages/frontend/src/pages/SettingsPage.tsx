import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreference, updatePreference, resetPreference, type UserPreference } from '../utils/preferenceApi';
import { PreferenceRenderer } from '../components/PreferenceRenderer';
import { clientLogger } from '../utils/clientLogger';
import { apiPath, assetPath } from '../utils/api';
import type { PreferenceHint, Platform } from '@chess/preference';
import { ErrorMessage } from '../components/common';

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

interface HintMessage {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  link?: { text: string; url: string };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('web');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [hints, setHints] = useState<HintMessage[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintIdRef = useRef(0);

  const loadPreference = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prefs, configRes] = await Promise.all([
        getPreference(),
        fetch(apiPath('/api/config')).then((r) => r.json()).catch(() => null),
      ]);

      const platform: Platform = configRes?.server?.platform ?? 'web';
      setCurrentPlatform(platform);
      setPreference(prefs);
      clientLogger.info(`Settings: loaded preference (platform: ${platform})`);
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

  const handleHint = useCallback((hint: PreferenceHint) => {
    const id = `hint-${++hintIdRef.current}`;
    const hintMessage: HintMessage = {
      id,
      message: hint.message,
      type: hint.type ?? 'info',
    };

    if (hint.link) {
      hintMessage.link = {
        text: hint.link.text,
        url: assetPath(hint.link.path),
      };
    }

    setHints((prev) => [...prev, hintMessage]);
    clientLogger.info('Settings: hint shown', { message: hint.message, type: hint.type, link: hint.link });
  }, []);

  const dismissHint = useCallback((id: string) => {
    setHints((prev) => prev.filter((h) => h.id !== id));
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

  const handleReset = useCallback(async () => {
    setSaveStatus('重置中...');
    setError(null);
    try {
      const reset = await resetPreference();
      setPreference(reset);
      setSaveStatus('已重置');
      clientLogger.info('Settings: preference reset');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '重置偏好设置失败';
      setError(message);
      setSaveStatus('重置失败');
      clientLogger.error('Settings: failed to reset preference', { error: message });
    }
  }, []);

  const handleBack = useCallback(() => {
    navigate('/menu');
  }, [navigate]);

  const handleViewLogs = useCallback(() => {
    clientLogger.info('Settings: view logs');
    navigate('/logs');
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
      <div className="page-fullscreen">
        <div className="sf-panel sf-panel--fullscreen sf-panel--center">
          <div className="sf-loading">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fullscreen">
      <div className="sf-panel sf-panel--fullscreen sf-panel--column">
        <div className="settings-header">
          <h1 className="settings-title">设置</h1>
          <div className="header-actions">
            {saveStatus && <span className="save-status">{saveStatus}</span>}
            <button className="sf-back-btn" onClick={handleBack}>返回菜单</button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {hints.map((hint) => (
          <div key={hint.id} className={`sf-hint sf-hint--${hint.type}`}>
            <span className="sf-hint__icon">
              {hint.type === 'warning' ? '⚠' : hint.type === 'success' ? '✓' : 'ℹ'}
            </span>
            <span className="sf-hint__text">
              {hint.message}
              {hint.link && (
                <>
                  {' '}
                  <a
                    href={hint.link.url}
                    className="hint-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (hint.link!.url.endsWith('.apk')) {
                        e.preventDefault();
                        const a = document.createElement('a');
                        a.href = hint.link!.url;
                        a.download = 'android-app.apk';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                  >
                    {hint.link.text}
                  </a>
                </>
              )}
            </span>
            <button className="sf-hint__close" onClick={() => dismissHint(hint.id)}>✕</button>
          </div>
        ))}

        {preference && (
          <PreferenceRenderer preference={preference} currentPlatform={currentPlatform} onChange={handleChange} onHint={handleHint} />
        )}

        <div className="sf-actions">
          <button className="sf-action-btn" onClick={handleViewLogs}>查看日志</button>
          <button className="sf-action-btn" onClick={handleApply}>应用</button>
          <button className="sf-action-btn" onClick={() => navigate('/test-menu')}>加载测试菜单</button>
          <button className="sf-action-btn sf-action-btn--danger" onClick={handleReset}>重置设置</button>
        </div>
      </div>
    </div>
  );
}
