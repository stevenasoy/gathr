import { defineConfig, devices } from '@playwright/test'

// E2E suite. Runs against the built app served by `vite preview`. Requires a
// seeded test Supabase project (E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY) and a
// demo gatherer account (E2E_USER_EMAIL / E2E_USER_PASSWORD). On CI these come
// from repo secrets; if absent, tests that need auth skip themselves.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    env: {
      VITE_SUPABASE_URL: process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build --workspace=apps/web && npm run preview --workspace=apps/web -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})