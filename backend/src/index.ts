import express from 'express';
import session from 'express-session';
import path from 'path';
import { createServer } from 'http';
import { chessConfig } from '../../chess.config';
import { GameServer } from './services/gameServer';
import gameRoutes from './routes/game';
import { GameManager } from './services/gameManager';
import { requestLogMiddleware } from './services/logger';

const app = express();
const server = createServer(app);

const gameManager = new GameManager();

app.use(express.json());
app.use(requestLogMiddleware());
app.use(
  session({
    secret: chessConfig.server.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: chessConfig.server.sessionMaxAgeMs,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use('/api/game', gameRoutes);

const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const gameServer = new GameServer(server, gameManager);

const PORT = chessConfig.server.port;
const HOST = chessConfig.server.host;

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
