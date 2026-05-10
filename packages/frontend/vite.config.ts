/**
 * Vite Build Configuration for Chinese Chess Frontend
 *
 * React 19 + TypeScript project that builds to ./dist for production serving.
 * Dev server runs on port 5173 with API and WebSocket proxy to backend.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // React plugin for JSX/TSX transformation
  plugins: [react()],
  resolve: {
    // Path alias: @chess/core points to core/src for internal imports
    alias: {
      '@chess/core': path.resolve(__dirname, '../core/src'),
    },
  },
  base: './',
  build: {
    // Output directory (served by Express in production)
    outDir: './dist',
    // Clean build directory before each build
    emptyOutDir: true,
    // Enable sourcemaps for debugging
    sourcemap: true,
    assetsDir: 'assets',
  },
  server: {
    // Dev server port
    port: 5173,
    // Proxy configuration: forward API and WebSocket requests to backend
    proxy: {
      // REST API proxy
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // WebSocket proxy
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
