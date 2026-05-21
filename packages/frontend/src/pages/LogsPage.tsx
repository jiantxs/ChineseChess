import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPath } from '../utils/api';
import './LogsPage.css';

type LogType = 'requests' | 'errors' | 'events' | 'games';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface LogsResponse {
  logs: LogEntry[];
  availableDates: string[];
}

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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(apiPath('/api/admin/logs'), window.location.origin);
      url.searchParams.set('type', activeTab);
      if (selectedDate) {
        url.searchParams.set('date', selectedDate);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: LogsResponse = await response.json();
      setLogs(data.logs || []);
      setAvailableDates(data.availableDates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日志失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
    return (
      log.message.toLowerCase().includes(query) ||
      log.level.toLowerCase().includes(query) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query))
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
      default:
        return 'log-level-default';
    }
  };

  const tabLabels: Record<LogType, string> = {
    requests: '请求日志',
    errors: '错误日志',
    events: '事件日志',
    games: '游戏日志',
  };

  return (
    <div className="logs-page">
      <div className="background-layer logs-bg" />

      <div className="logs-container">
        <div className="logs-header">
          <h1 className="logs-title">日志查看器</h1>
          <button className="back-btn" onClick={() => navigate('/menu')}>
            返回菜单
          </button>
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
                  className="export-btn"
                  onClick={handleExportAll}
                  disabled={loading}
                >
                  导出全部
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">!</span>
                {error}
              </div>
            )}

            <div className="logs-table-container">
              {loading ? (
                <div className="loading">加载中...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="no-logs">暂无日志</div>
              ) : (
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
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
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
                          <td className="col-message">{log.message}</td>
                        </tr>
                        {expandedRows.has(index) && log.metadata && (
                          <tr key={`${index}-detail`} className="log-detail-row">
                            <td colSpan={4}>
                              <pre className="log-detail">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
      </div>
    </div>
  );
}