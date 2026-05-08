"use strict";
/**
 * @fileoverview Admin dashboard API with Basic authentication
 * @module backend/src/routes/admin
 *
 * Provides admin dashboard endpoints for monitoring games, logs, and server health.
 * All endpoints require Basic authentication (username: admin, password from chessConfig).
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("@chess/config");
/** Express router for admin endpoints */
const router = (0, express_1.Router)();
/**
 * Basic authentication middleware for admin routes
 * @description Validates Basic auth credentials against configured admin password.
 *              Returns 401 with WWW-Authenticate header if credentials are missing or invalid.
 *
 * @param req - Express request with Authorization header
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * // Valid request header:
 * // Authorization: Basic YWRtaW46cGFzc3dvcmQxMjM=
 * // (base64 encoded "admin:password123")
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
        res.status(401).send('Authentication required');
        return;
    }
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    if (username !== 'admin' || password !== config_1.chessConfig.admin.password) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
        res.status(401).send('Invalid credentials');
        return;
    }
    next();
}
/**
 * Read log files for a specific date
 * @description Reads and parses request/error log files from the specified directory
 *              for a given date. Returns empty array if date format is invalid or files don't exist.
 *
 * @param logDir - Relative path to log directory (e.g., 'logs/requests')
 * @param date - Date string in YYYY-MM-DD format
 * @returns Array of log entry strings, filtered to remove empty lines
 *
 * @remarks
 * - Date must be in YYYY-MM-DD format
 * - Log files are expected to be named: request-YYYY-MM-DD.log
 * - Returns empty array for invalid date formats or missing files
 */
function readLogFiles(logDir, date) {
    const files = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return files;
    }
    const logPath = path_1.default.resolve(process.cwd(), logDir);
    if (!fs_1.default.existsSync(logPath))
        return files;
    const logFile = path_1.default.join(logPath, `request-${date}.log`);
    if (fs_1.default.existsSync(logFile)) {
        const content = fs_1.default.readFileSync(logFile, 'utf-8');
        files.push(...content.split('\n').filter(line => line.trim()));
    }
    return files;
}
/**
 * Read archived game JSON files from a directory
 * @description Reads and parses all .json game files from the specified directory.
 *              Files are sorted by createdAt timestamp in descending order (newest first).
 *
 * @param gameDir - Relative path to game directory (e.g., 'logs/games/active')
 * @returns Array of parsed game objects, sorted by creation date descending
 *
 * @remarks
 * - Only reads files with .json extension
 * - Silently skips files that fail to parse
 * - Sorts games by createdAt field in descending order
 */
function readGameFiles(gameDir) {
    const games = [];
    const gamePath = path_1.default.resolve(process.cwd(), gameDir);
    if (!fs_1.default.existsSync(gamePath))
        return games;
    const files = fs_1.default.readdirSync(gamePath);
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const content = fs_1.default.readFileSync(path_1.default.join(gamePath, file), 'utf-8');
                const game = JSON.parse(content);
                games.push(game);
            }
            catch (err) {
                console.error(`Failed to read game file ${file}:`, err);
            }
        }
    }
    return games.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
/**
 * Get request logs for a specific date
 * @route GET /admin/api/logs/requests
 * @param req.query.date - Optional date in YYYY-MM-DD format (defaults to today)
 * @returns JSON with date, count, and array of last 100 log entries
 */
router.get('/api/logs/requests', requireAuth, (req, res) => {
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
    }
    const logs = readLogFiles(config_1.chessConfig.log.requestLogDir, dateParam);
    res.json({ date: dateParam, count: logs.length, logs: logs.slice(-100) });
});
/**
 * Get error logs for a specific date
 * @route GET /admin/api/logs/errors
 * @param req.query.date - Optional date in YYYY-MM-DD format (defaults to today)
 * @returns JSON with date, count, and array of last 100 error log entries
 */
router.get('/api/logs/errors', requireAuth, (req, res) => {
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
    }
    const logs = readLogFiles(config_1.chessConfig.log.errorLogDir, dateParam);
    res.json({ date: dateParam, count: logs.length, logs: logs.slice(-100) });
});
/**
 * Get archived active game files
 * @route GET /admin/api/games/active
 * @description Returns games from the active games directory (games that finished but not yet archived)
 * @returns JSON with count and array of game objects
 */
router.get('/api/games/active', requireAuth, (req, res) => {
    const games = readGameFiles(path_1.default.join(config_1.chessConfig.log.gameLogDir, 'active'));
    res.json({ count: games.length, games });
});
/**
 * Get archived game files
 * @route GET /admin/api/games/archived
 * @description Returns games from the archive directory (completed games)
 * @returns JSON with count and array of game objects
 */
router.get('/api/games/archived', requireAuth, (req, res) => {
    const games = readGameFiles(path_1.default.join(config_1.chessConfig.log.gameLogDir, 'archive'));
    res.json({ count: games.length, games });
});
/**
 * Get currently active games from GameManager
 * @route GET /admin/api/games/live
 * @description Returns live game state for all games currently managed in memory
 * @returns JSON with count and array of game summaries including id, status, players, moves
 */
router.get('/api/games/live', requireAuth, (req, res) => {
    const gameManager = req.app.locals.gameManager;
    if (!gameManager) {
        res.status(500).json({ error: 'Game manager not available' });
        return;
    }
    const games = gameManager.getAllGames();
    res.json({
        count: games.length,
        games: games.map(g => ({
            id: g.id,
            status: g.status,
            currentTurn: g.currentTurn,
            redPlayer: g.redPlayer ? 'connected' : 'waiting',
            blackPlayer: g.blackPlayer ? 'connected' : 'waiting',
            moveCount: g.moves.length,
            lastMoveTime: g.lastMoveTime,
            createdAt: g.createdAt,
        }))
    });
});
/**
 * Serve admin dashboard HTML page
 * @route GET /admin
 * @description Returns a single-page dashboard for monitoring games and logs
 * @requires Basic authentication
 * @returns HTML page with tabs for overview, live games, active games, archived games, and logs
 */
router.get('/', requireAuth, (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>象棋管理后台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; }
        .header { background: #16213e; padding: 1rem 2rem; border-bottom: 2px solid #0f3460; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { color: #e94560; font-size: 1.5rem; }
        .nav { display: flex; gap: 0.5rem; }
        .nav button { background: #0f3460; color: #eee; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
        .nav button:hover, .nav button.active { background: #e94560; }
        .container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #16213e; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #e94560; }
        .stat-card h3 { font-size: 0.875rem; color: #aaa; margin-bottom: 0.5rem; }
        .stat-card .value { font-size: 2rem; font-weight: bold; color: #e94560; }
        .log-container { background: #16213e; border-radius: 8px; padding: 1rem; max-height: 600px; overflow-y: auto; }
        .log-entry { padding: 0.5rem; border-bottom: 1px solid #0f3460; font-family: monospace; font-size: 0.875rem; }
        .log-entry:hover { background: #0f3460; }
        .game-list { display: grid; gap: 1rem; }
        .game-card { background: #16213e; padding: 1rem; border-radius: 8px; border-left: 4px solid #533483; }
        .game-card.playing { border-left-color: #e94560; }
        .game-card.waiting { border-left-color: #f39c12; }
        .game-card.finished { border-left-color: #27ae60; }
        .game-card.aborted { border-left-color: #e74c3c; }
        .game-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .game-id { font-family: monospace; color: #aaa; }
        .status-badge { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
        .status-playing { background: #e94560; }
        .status-waiting { background: #f39c12; color: #000; }
        .status-finished { background: #27ae60; }
        .status-aborted { background: #e74c3c; }
        .game-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.875rem; color: #aaa; }
        .refresh-btn { background: #533483; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }
        .refresh-btn:hover { background: #e94560; }
        .empty-state { text-align: center; padding: 3rem; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>象棋管理后台</h1>
        <div class="nav">
            <button class="active" onclick="showTab('overview')">概览</button>
            <button onclick="showTab('live-games')">实时游戏</button>
            <button onclick="showTab('active-games')">活跃对局</button>
            <button onclick="showTab('archived-games')">归档对局</button>
            <button onclick="showTab('request-logs')">请求日志</button>
            <button onclick="showTab('error-logs')">错误日志</button>
        </div>
    </div>
    <div class="container">
        <div id="overview" class="tab-content active">
            <div class="stats-grid">
                <div class="stat-card"><h3>实时游戏数</h3><div class="value" id="live-game-count">-</div></div>
                <div class="stat-card"><h3>活跃对局数</h3><div class="value" id="active-game-count">-</div></div>
                <div class="stat-card"><h3>归档对局数</h3><div class="value" id="archived-game-count">-</div></div>
                <div class="stat-card"><h3>今日请求数</h3><div class="value" id="request-count">-</div></div>
            </div>
        </div>
        <div id="live-games" class="tab-content"><button class="refresh-btn" onclick="loadLiveGames()">刷新</button><div id="live-games-list" class="game-list"></div></div>
        <div id="active-games" class="tab-content"><button class="refresh-btn" onclick="loadActiveGames()">刷新</button><div id="active-games-list" class="game-list"></div></div>
        <div id="archived-games" class="tab-content"><button class="refresh-btn" onclick="loadArchivedGames()">刷新</button><div id="archived-games-list" class="game-list"></div></div>
        <div id="request-logs" class="tab-content"><button class="refresh-btn" onclick="loadRequestLogs()">刷新</button><div id="request-logs-list" class="log-container"></div></div>
        <div id="error-logs" class="tab-content"><button class="refresh-btn" onclick="loadErrorLogs()">刷新</button><div id="error-logs-list" class="log-container"></div></div>
    </div>
    <script>
        function showTab(tabId) { document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active')); document.getElementById(tabId).classList.add('active'); event.target.classList.add('active'); if (tabId === 'live-games') loadLiveGames(); else if (tabId === 'active-games') loadActiveGames(); else if (tabId === 'archived-games') loadArchivedGames(); else if (tabId === 'request-logs') loadRequestLogs(); else if (tabId === 'error-logs') loadErrorLogs(); else if (tabId === 'overview') loadOverview(); }
        async function fetchAPI(endpoint) { try { const response = await fetch(endpoint); if (!response.ok) throw new Error('API Error'); return await response.json(); } catch (err) { console.error('API Error:', err); return null; } }
        async function loadOverview() { const [live, active, archived, requests] = await Promise.all([fetchAPI('/admin/api/games/live'), fetchAPI('/admin/api/games/active'), fetchAPI('/admin/api/games/archived'), fetchAPI('/admin/api/logs/requests')]); if (live) document.getElementById('live-game-count').textContent = live.count; if (active) document.getElementById('active-game-count').textContent = active.count; if (archived) document.getElementById('archived-game-count').textContent = archived.count; if (requests) document.getElementById('request-count').textContent = requests.count; }
        function renderGameCard(game, isLive = false) { const statusClass = game.status || 'waiting'; const moveCount = game.moves ? game.moves.length : 0; const redStatus = isLive ? game.redPlayer : (game.redPlayer ? '已连接' : '未连接'); const blackStatus = isLive ? game.blackPlayer : (game.blackPlayer ? '已连接' : '未连接'); return \`<div class="game-card \${statusClass}"><div class="game-header"><span class="game-id">\${game.id}</span><span class="status-badge status-\${statusClass}">\${game.status}</span></div><div class="game-details"><div>红方: \${redStatus}</div><div>黑方: \${blackStatus}</div><div>步数: \${moveCount}</div><div>当前回合: \${game.currentTurn || '-'}</div><div>创建时间: \${game.createdAt ? new Date(game.createdAt).toLocaleString() : '-'}</div>\${game.lastMoveTime ? \`<div>最后移动: \${new Date(game.lastMoveTime).toLocaleString()}</div>\` : ''}\${game.winner ? \`<div>获胜方: \${game.winner}</div>\` : ''}</div></div>\`; }
        async function loadLiveGames() { const data = await fetchAPI('/admin/api/games/live'); const container = document.getElementById('live-games-list'); if (!data || data.games.length === 0) { container.innerHTML = '<div class="empty-state">暂无实时游戏</div>'; return; } container.innerHTML = data.games.map(g => renderGameCard(g, true)).join(''); }
        async function loadActiveGames() { const data = await fetchAPI('/admin/api/games/active'); const container = document.getElementById('active-games-list'); if (!data || data.games.length === 0) { container.innerHTML = '<div class="empty-state">暂无活跃对局</div>'; return; } container.innerHTML = data.games.map(g => renderGameCard(g)).join(''); }
        async function loadArchivedGames() { const data = await fetchAPI('/admin/api/games/archived'); const container = document.getElementById('archived-games-list'); if (!data || data.games.length === 0) { container.innerHTML = '<div class="empty-state">暂无归档对局</div>'; return; } container.innerHTML = data.games.map(g => renderGameCard(g)).join(''); }
        function renderLogEntry(log) { try { const data = JSON.parse(log); return \`<div class="log-entry">\${JSON.stringify(data, null, 2)}</div>\`; } catch { return \`<div class="log-entry">\${log}</div>\`; } }
        async function loadRequestLogs() { const data = await fetchAPI('/admin/api/logs/requests'); const container = document.getElementById('request-logs-list'); if (!data || data.logs.length === 0) { container.innerHTML = '<div class="empty-state">暂无请求日志</div>'; return; } container.innerHTML = data.logs.map(r => renderLogEntry(r)).join(''); }
        async function loadErrorLogs() { const data = await fetchAPI('/admin/api/logs/errors'); const container = document.getElementById('error-logs-list'); if (!data || data.logs.length === 0) { container.innerHTML = '<div class="empty-state">暂无错误日志</div>'; return; } container.innerHTML = data.logs.map(r => renderLogEntry(r)).join(''); }
        loadOverview();
        setInterval(loadOverview, 30000);
    </script>
</body>
</html>`);
});
exports.default = router;
//# sourceMappingURL=admin.js.map