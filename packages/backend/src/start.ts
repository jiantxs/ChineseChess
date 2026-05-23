import { startServer } from './index.js';
import { createChessConfig } from '@chess/config';

const config = createChessConfig();
const { stop } = startServer(config);

process.on('SIGTERM', () => {
  stop();
});

process.on('SIGINT', () => {
  stop();
});
