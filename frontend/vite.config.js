import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || process.env.API_BASE_URL || 'http://127.0.0.1:8001';

const proxyConfig = {
  '/api': {
    target: backendTarget,
    changeOrigin: true,
  },
  '/uploads': {
    target: backendTarget,
    changeOrigin: true,
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
  }
});
