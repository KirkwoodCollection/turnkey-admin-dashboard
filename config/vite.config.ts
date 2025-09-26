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
      // COMPONENT TESTING: Change target to 'http://localhost:8888' to test individual components
      // Then run: node test-server.js in a separate terminal
      '/api/v1': {
        target: 'https://api.turnkeyhms.com', // Change to 'http://localhost:8888' for testing
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: 'https://api.turnkeyhms.com',
        changeOrigin: true,
        secure: true,
      },
      '/sessions': {
        target: 'https://api.turnkeyhms.com',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'wss://api.turnkeyhms.com',
        ws: true,
        changeOrigin: true,
        secure: true,
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