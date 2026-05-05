"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const chess_config_1 = require("../../chess.config");
const gameServer_1 = require("./services/gameServer");
const game_1 = __importStar(require("./routes/game"));
const gameManager_1 = require("./services/gameManager");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const gameManager = new gameManager_1.GameManager();
(0, game_1.setGameManager)(gameManager);
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: chess_config_1.chessConfig.server.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: chess_config_1.chessConfig.server.sessionMaxAgeMs,
        secure: process.env.NODE_ENV === 'production',
    },
}));
app.use('/api/game', game_1.default);
const publicPath = path_1.default.resolve(__dirname, '../public');
app.use(express_1.default.static(publicPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
const gameServer = new gameServer_1.GameServer(server, gameManager);
const PORT = chess_config_1.chessConfig.server.port;
const HOST = chess_config_1.chessConfig.server.host;
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