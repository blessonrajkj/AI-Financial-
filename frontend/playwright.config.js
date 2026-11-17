import { defineConfig, devices } from '@playwright/test';

const backendPort = process.env.BACKEND_PORT || process.env.PORT || 8001;
const frontendUrl = process.env.E2E_BASE_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: `cd ../backend && python -m uvicorn app.main:app --port ${backendPort}`,
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npx vite preview --port 3001 --host 127.0.0.1',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: true,
      timeout: 30000,
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
