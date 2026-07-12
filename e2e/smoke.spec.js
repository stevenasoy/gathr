import { test, expect } from '@playwright/test'

// Smoke + auth flow. Requires E2E_SUPABASE_URL + a demo account; otherwise the
// auth spec skips (see `test.skip`).

test('home loads and shows the brand', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Gathr/i)
})

test('unauthenticated user can reach the sign-in page', async ({ page }) => {
  await page.goto('/signin')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('a gated route redirects to sign-in affordance', async ({ page }) => {
  await page.goto('/bookings')
  // Not signed in → the page shows a "Sign in to view bookings" affordance.
  await expect(page.getByText(/sign in to view bookings/i)).toBeVisible()
})

const hasAuthEnv = process.env.E2E_SUPABASE_URL && process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD

test('signed-in gatherer can sign in and see bookings list', async ({ page }) => {
  test.skip(!hasAuthEnv, 'requires E2E_SUPABASE_URL + E2E_USER_EMAIL/PASSWORD')
  await page.goto('/signin')
  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL)
  await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/')
  await page.goto('/bookings')
  await expect(page).toHaveTitle(/bookings/i)
})