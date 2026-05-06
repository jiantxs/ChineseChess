import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@chess/core': path.resolve(__dirname, '../core/src'),
      '@chess/config': path.resolve(__dirname, '../config/src'),
    },
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
    sourcemap: true,
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
