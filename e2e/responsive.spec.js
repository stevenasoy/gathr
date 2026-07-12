import { test, expect } from '@playwright/test'

const phone = { width: 390, height: 844 }

async function expectControlsInViewport(locator) {
  const overflow = await locator.evaluateAll((nodes) => nodes.flatMap((node) => {
    const rect = node.getBoundingClientRect()
    const style = getComputedStyle(node)

    if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') return []

    return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1
      ? [{ name: node.getAttribute('aria-label') || node.textContent?.trim(), left: rect.left, right: rect.right }]
      : []
  }))

  expect(overflow).toEqual([])
}

async function expectNoPageOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
}

test('phone navigation and search controls remain reachable', async ({ page }) => {
  await page.setViewportSize(phone)

  await page.goto('/')
  await expect(page.getByRole('search')).toBeVisible()
  await expectControlsInViewport(page.locator(
    'header a, header button, form[role="search"] input, form[role="search"] select, form[role="search"] button[type="submit"]',
  ))
  await expectNoPageOverflow(page)

  await page.goto('/search')
  await expect(page.getByRole('search')).toBeVisible()
  await expectControlsInViewport(page.locator(
    'header a, header button, form[role="search"] input, form[role="search"] select, form[role="search"] button[type="submit"]',
  ))
  await expectControlsInViewport(page.getByRole('button', { name: /^Filters/ }))
  await expectNoPageOverflow(page)
})

test('legacy content shell stays constrained and collapses on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/about')

  const shell = await page.locator('main > .wrap.page-body').boundingBox()
  expect(shell?.width).toBeLessThanOrEqual(1280)
  expect(shell?.x).toBeGreaterThan(0)

  await page.setViewportSize(phone)

  const [first, third] = await Promise.all([
    page.getByText('Venues listed', { exact: true }).locator('..').boundingBox(),
    page.getByText('Events hosted', { exact: true }).locator('..').boundingBox(),
  ])
  expect(third?.y).toBeGreaterThan((first?.y ?? 0) + 1)
  await expectNoPageOverflow(page)
})
