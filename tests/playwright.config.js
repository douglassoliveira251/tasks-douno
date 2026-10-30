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
    // TEST_DIST=1: testa o resultado do build (npm run build na raiz) em vez dos arquivos-fonte
    command: process.env.TEST_DIST ? 'python serve.py 8724 ../dist' : 'python serve.py 8724 ..',
    url: 'http://localhost:8724/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
