import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || process.env.API_BASE_URL || 'http://127.0.0.1:8000';

const proxyConfig = {
  '/api': {
    target: backendTarget,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('error', (err, req, res) => {
        if (res.writeHead && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Cannot connect to backend server. Please ensure the backend is running.' }));
        }
      });
    }
  },
  '/uploads': {
    target: backendTarget,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('error', (err, req, res) => {
        if (res.writeHead && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Cannot connect to backend server. Please ensure the backend is running.' }));
        }
      });
    }
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: proxyConfig
  },
  preview: {
    port: 3001,
    host: true,
    proxy: proxyConfig
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          icons: ['lucide-react']
        }
      }
    }
  }
});
