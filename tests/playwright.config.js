import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8724',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python serve.py 8724 ..',
    url: 'http://localhost:8724/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
