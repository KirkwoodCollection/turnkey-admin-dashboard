import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  server: {
    port: 3001,
    host: true,
    proxy: {
      // Analytics service endpoints
      '/api/v1/metrics': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/analytics': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // Events service admin endpoints
      '/api/v1/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // WebSocket service (fallback to Events service for now)
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui': ['@mui/material', '@mui/icons-material'],
          'charts': ['plotly.js', 'react-plotly.js'],
        },
      },
    },
  },
});