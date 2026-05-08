"use strict";
/**
 * @fileoverview Express server entry point for Chinese Chess backend
 * @module backend/src/index
 *
 * Sets up Express HTTP server with WebSocket support for real-time multiplayer Chinese Chess.
 * Handles session middleware, static file serving, API routes, and graceful shutdown.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const config_1 = require("@chess/config");
const gameServer_1 = require("./services/gameServer");
const game_1 = __importDefault(require("./routes/game"));
const admin_1 = __importDefault(require("./routes/admin"));
const config_2 = __importDefault(require("./routes/config"));
const core_1 = require("@chess/core");
const logger_1 = require("./services/logger");
/** Express application instance */
const app = (0, express_1.default)();
/** HTTP server instance wrapping Express app */
const server = (0, http_1.createServer)(app);
/**
 * Middleware: Parse JSON request bodies
 * @remarks Enables Express to handle JSON payloads in POST/PUT requests
 */
app.use(express_1.default.json());
/**
 * Middleware: Log all HTTP requests using Winston
 * @remarks Records method, URL, path, status code, duration, IP, user-agent, and playerId
 */
app.use((0, logger_1.requestLogMiddleware)());
/**
 * Middleware: Session management for player identity
 * @remarks Stores playerId in session for session-based authentication
 * @see {@link https://www.npmjs.com/package/express-session|express-session}
 */
app.use((0, express_session_1.default)({
    secret: config_1.chessConfig.server.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: config_1.chessConfig.server.sessionMaxAgeMs,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
    },
}));
/** Mount game routes at /api/game - handles player ID generation */
app.use('/api/game', game_1.default);
/** Mount config routes at /api - returns server configuration and layouts */
app.use('/api', config_2.default);
/** Mount admin routes at /admin - protected by Basic authentication */
app.use('/admin', admin_1.default);
/**
 * Global error handling middleware
 * @remarks Catches unhandled errors and returns 500 Internal Server Error
 * @param err - The error thrown during request processing
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
/**
 * Store game manager reference in app.locals for access by admin routes
 * @remarks Allows admin routes to retrieve live game state from GameManager
 */
app.locals.gameManager = core_1.gameManager;
/**
 * Path to frontend build output directory
 * @remarks Serves compiled React assets from node_modules/@chess/frontend/dist
 */
const publicPath = path_1.default.resolve(__dirname, '../node_modules/@chess/frontend/dist');
/**
 * Middleware: Serve static files from frontend build directory
 * @remarks Serves JS, CSS, and other static assets for the React frontend
 */
app.use(express_1.default.static(publicPath));
/**
 * Catch-all route for SPA navigation
 * @remarks Returns index.html for all non-API routes, enabling client-side routing
 */
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
/**
 * WebSocket game server instance
 * @remarks Handles real-time multiplayer game logic via /ws path
 * @see {@link GameServer}
 */
const gameServer = new gameServer_1.GameServer(server, core_1.gameManager);
/** Server port from configuration (default: 3000) */
const PORT = config_1.chessConfig.server.port;
/** Server host from configuration (default: 0.0.0.0) */
const HOST = config_1.chessConfig.server.host;
/**
 * Start HTTP and WebSocket servers
 * @remarks Begins listening on configured port and host, logs startup message
 */
server.listen(PORT, HOST, () => {
    console.log(`Chinese Chess server running on http://${HOST}:${PORT}`);
});
/**
 * Graceful shutdown handler
 * @remarks Listens for SIGTERM signal, stops GameServer intervals, closes HTTP server,
 * then exits process cleanly. Ensures proper cleanup of WebSocket connections and timers.
 * @param signal - The signal received (SIGTERM)
 */
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    gameServer.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map