"use strict";
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
const core_1 = require("@chess/core");
const logger_1 = require("./services/logger");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const gameManager = new core_1.GameManager();
app.use(express_1.default.json());
app.use((0, logger_1.requestLogMiddleware)());
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
app.use('/api/game', game_1.default);
app.use('/admin', admin_1.default);
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
app.locals.gameManager = gameManager;
const publicPath = path_1.default.resolve(__dirname, '../node_modules/@chess/frontend/dist');
app.use(express_1.default.static(publicPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
const gameServer = new gameServer_1.GameServer(server, gameManager);
const PORT = config_1.chessConfig.server.port;
const HOST = config_1.chessConfig.server.host;
server.listen(PORT, HOST, () => {
    console.log(`Chinese Chess server running on http://${HOST}:${PORT}`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    gameServer.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map