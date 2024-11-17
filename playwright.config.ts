import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.test.ts',
  fullyParallel: false, // Run tests sequentially to avoid extension conflicts
  timeout: 60000, // Increase timeout to 60 seconds
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});