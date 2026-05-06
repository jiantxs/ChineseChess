import express from 'express';
import session from 'express-session';
import path from 'path';
import { createServer } from 'http';
import { chessConfig } from '@chess/config';
import { GameServer } from './services/gameServer';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';
import { GameManager } from '@chess/core';
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
app.use('/admin', adminRoutes);

app.locals.gameManager = gameManager;

const publicPath = path.resolve(__dirname, '../node_modules/@chess/frontend/dist');
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
