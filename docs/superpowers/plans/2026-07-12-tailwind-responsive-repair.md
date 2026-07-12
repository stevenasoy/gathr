# Tailwind Responsive Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the responsive behavior lost during the Tailwind migration without reverting the new visual direction.

**Architecture:** Keep Tailwind as the styling system. Restore the shared CSS contracts that the migration accidentally removed, scope the old venue-card grid so it cannot override Tailwind utilities, and add responsive variants or existing semantic hooks only where a route needs them.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3.4, Vite, Playwright.

## Global Constraints

- Preserve the current warm Tailwind visual design and existing user changes in `apps/web/index.html` and `apps/api/src/index.ts`.
- Add no dependencies.
- Keep the migration repair focused; do not rewrite page structure or data flows.
- Verify public routes at phone, tablet, and desktop widths with the existing Playwright setup.

---

### Task 1: Add a failing responsive regression test

**Files:**
- Create: `e2e/responsive.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('public layouts adapt without horizontal overflow', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const path of paths) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    }
  }
})

test('the mobile home search form stacks fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('search')).toHaveCSS('flex-direction', 'column')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test e2e/responsive.spec.js --project=chromium`

Expected: the home search form reports `flex-direction: row` at a 390px viewport.

### Task 2: Repair shared Tailwind and CSS contracts

**Files:**
- Modify: `apps/web/tailwind.config.js`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/pages/Home.tsx`
- Modify: `apps/web/src/pages/Search.tsx`
- Modify: `apps/web/src/pages/Saved.tsx`
- Modify: `apps/web/src/pages/HostDashboard.tsx`
- Modify: `apps/web/src/pages/Venue.tsx`

- [ ] **Step 1: Scope the legacy venue-card grid**

Rename the legacy `.grid` and `.grid.rail` component selectors to `.venue-grid` and `.venue-grid.rail`, then update the five venue-list callers. This preserves automatic card columns without overriding Tailwind's global `.grid` and `grid-cols-*` utilities.

- [ ] **Step 2: Restore the shared container and breakpoint rules**

Restore `.wrap` as the shared `max-w-wrap` centered container. Replace duplicate, contradictory media blocks with one ordered responsive section that reduces shared gutters and handles known semantic layout hooks.

- [ ] **Step 3: Make token colors support Tailwind opacity modifiers**

Use Tailwind color definitions that accept `<alpha-value>` so generated classes such as `bg-ink/[0.02]` and `bg-brand/[0.15]` are emitted again.

### Task 3: Reconnect responsive page layouts

**Files:**
- Modify: `apps/web/src/components/Header.tsx`
- Modify: `apps/web/src/components/Footer.tsx`
- Modify: `apps/web/src/components/PhotoManager.tsx`
- Modify: `apps/web/src/pages/Home.tsx`
- Modify: `apps/web/src/pages/Search.tsx`
- Modify: `apps/web/src/pages/Venue.tsx`
- Modify: `apps/web/src/pages/Messages.tsx`
- Modify: `apps/web/src/pages/HostDashboard.tsx`
- Modify: `apps/web/src/pages/HostNew.tsx`
- Modify: `apps/web/src/pages/About.tsx`
- Modify: `apps/web/src/pages/Contact.tsx`
- Modify: `apps/web/src/pages/Community.tsx`
- Modify: `apps/web/src/pages/Help.tsx`
- Modify: `apps/web/src/pages/HostResources.tsx`
- Modify: `apps/web/src/pages/Sitemap.tsx`

- [ ] **Step 1: Restore mobile navigation, search, footer, inbox, venue, and dashboard behavior**

Add the existing semantic hooks where the global responsive CSS already owns the behavior, or add equivalent Tailwind breakpoint utilities where a hook would only serve one element. Ensure phone layouts use single-column content grids, stack booking fields, make the inbox vertical, and let navigation actions wrap or scroll instead of overflowing.

- [ ] **Step 2: Repair fixed static-page grids**

Ensure the contact layout, stats, content cards, stories, resource cards, and sitemap collapse at the same breakpoints as their pre-migration behavior.

### Task 4: Verify the migration repair

**Files:**
- Test: `e2e/responsive.spec.js`

- [ ] **Step 1: Run the new responsive regression test**

Run: `npx playwright test e2e/responsive.spec.js --project=chromium`

Expected: all responsive assertions pass.

- [ ] **Step 2: Run the project quality gates**

Run: `npm run lint`, `npm run test:ci --workspace=apps/web`, and `npm run build`.

Expected: each command exits successfully.
