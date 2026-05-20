import { startServer } from './index.js';

const { stop } = startServer();

process.on('SIGTERM', () => {
  stop();
});

process.on('SIGINT', () => {
  stop();
});
