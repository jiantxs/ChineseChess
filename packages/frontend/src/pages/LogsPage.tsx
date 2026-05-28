import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPath } from '../utils/api';
import './LogsPage.css';

type LogType = 'requests' | 'errors' | 'events' | 'games';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

interface LogsResponse {
  logs: LogEntry[];
  availableDates: string[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const LOGS_PER_PAGE = 100;
const REFRESH_INTERVAL = 5000;

export default function LogsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LogType>('requests');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [availableGames, setAvailableGames] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async (currentOffset: number = 0, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(apiPath('/api/admin/logs'), window.location.origin);
      url.searchParams.set('type', activeTab);
      url.searchParams.set('limit', String(LOGS_PER_PAGE));
      url.searchParams.set('offset', String(currentOffset));
      if (selectedDate) {
        url.searchParams.set('date', selectedDate);
      }
      if (activeTab === 'games' && selectedGameId) {
        url.searchParams.set('gameId', selectedGameId);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: LogsResponse = await response.json();

      if (append) {
        setLogs((prev) => [...prev, ...(data.logs || [])]);
      } else {
        setLogs(data.logs || []);
      }
      setAvailableDates(data.availableDates || []);
      setHasMore(data.hasMore || false);
      setTotal(data.total || 0);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日志失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, selectedGameId]);

  useEffect(() => {
    setOffset(0);
    fetchLogs(0, false);
  }, [activeTab, selectedDate, selectedGameId, fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchLogs(0, false);
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, fetchLogs]);

  const loadMore = useCallback(() => {
    const newOffset = offset + LOGS_PER_PAGE;
    setOffset(newOffset);
    fetchLogs(newOffset, true);
  }, [offset, fetchLogs]);

  const fetchAvailableGames = useCallback(async () => {
    try {
      const response = await fetch(apiPath('/api/admin/logs/files?type=games'));
      if (!response.ok) return;
      const data = await response.json();
      const gameIds = (data.files || [])
        .map((f: { gameId?: string }) => f.gameId)
        .filter(Boolean);
      const uniqueGames = [...new Set(gameIds)];
      setAvailableGames(uniqueGames as string[]);
      if (uniqueGames.length > 0 && !selectedGameId) {
        setSelectedGameId(uniqueGames[0] as string);
      }
    } catch {
      void 0;
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (activeTab === 'games') {
      fetchAvailableGames();
    }
  }, [activeTab, fetchAvailableGames]);

  const handleExportAll = useCallback(async () => {
    try {
      const response = await fetch(apiPath('/api/admin/logs/export'), {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Export failed: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${selectedDate || 'all'}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    }
  }, [selectedDate]);

  const toggleRowExpansion = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const messageStr = String(log.message || '').toLowerCase();
    const levelStr = String(log.level || '').toLowerCase();
    const fullLogStr = JSON.stringify(log).toLowerCase();
    return (
      messageStr.includes(query) ||
      levelStr.includes(query) ||
      fullLogStr.includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'log-level-error';
      case 'warn':
        return 'log-level-warn';
      case 'info':
        return 'log-level-info';
      case 'debug':
        return 'log-level-debug';
      default:
        return 'log-level-default';
    }
  };

  const getLogDetails = (log: LogEntry): Record<string, unknown> => {
    const { timestamp, level, message, ...rest } = log;
    return rest;
  };

  const hasDetails = (log: LogEntry): boolean => {
    const details = getLogDetails(log);
    return Object.keys(details).length > 0;
  };

  const tabLabels: Record<LogType, string> = {
    requests: '请求日志',
    errors: '错误日志',
    events: '事件日志',
    games: '游戏日志',
  };

  return (
    <div className="logs-page">
      <div className="logs-container">
        <div className="logs-header">
          <h1 className="logs-title">日志查看器</h1>
          <div className="header-actions">
            <div className="refresh-status">
              <label className="auto-refresh-label">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                自动刷新
              </label>
              <span className="last-refresh">
                上次更新: {lastRefresh.toLocaleTimeString('zh-CN')}
              </span>
            </div>
            <button className="back-btn" onClick={() => navigate('/menu')}>
              返回菜单
            </button>
          </div>
        </div>

        <div className="logs-controls">
          <div className="tabs">
            {(Object.keys(tabLabels) as LogType[]).map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="filters">
            {activeTab === 'games' && (
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="date-select"
              >
                <option value="">选择游戏</option>
                {availableGames.map((gameId) => (
                  <option key={gameId} value={gameId}>
                    {gameId.slice(0, 8)}...
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-select"
            >
              <option value="">所有日期</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索日志..."
              className="search-input"
            />

            <button
              className="refresh-btn"
              onClick={() => fetchLogs(0, false)}
              disabled={loading}
            >
              刷新
            </button>

            <button
              className="export-btn"
              onClick={handleExportAll}
              disabled={loading}
            >
              导出全部
            </button>
          </div>
        </div>

        <div className="logs-stats">
          显示 {filteredLogs.length} / {total} 条日志
          {hasMore && !searchQuery && (
            <span className="has-more-indicator">(还有更多)</span>
          )}
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        <div className="logs-table-container" ref={tableContainerRef}>
          {loading && logs.length === 0 ? (
            <div className="loading">加载中...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="no-logs">暂无日志</div>
          ) : (
            <>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th className="col-expand"></th>
                    <th className="col-time">时间</th>
                    <th className="col-level">级别</th>
                    <th className="col-message">消息</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <>
                      <tr key={index} className="log-row">
                        <td className="col-expand">
                          {hasDetails(log) && (
                            <button
                              className="expand-btn"
                              onClick={() => toggleRowExpansion(index)}
                            >
                              {expandedRows.has(index) ? '▼' : '▶'}
                            </button>
                          )}
                        </td>
                        <td className="col-time">{formatDate(log.timestamp)}</td>
                        <td className="col-level">
                          <span className={`level-badge ${getLevelClass(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="col-message">
                          <div className="message-content" title={String(log.message)}>
                            {String(log.message)}
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(index) && hasDetails(log) && (
                        <tr key={`${index}-detail`} className="log-detail-row">
                          <td colSpan={4}>
                            <pre className="log-detail">
                              {JSON.stringify(getLogDetails(log), null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>

              {hasMore && !searchQuery && (
                <div className="load-more-container">
                  <button
                    className="load-more-btn"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? '加载中...' : `加载更多 (已显示 ${logs.length} / ${total})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
