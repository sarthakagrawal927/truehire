import { expect, test } from '@playwright/test';

/**
 * Mobile-viewport checks. Run only the mobile project:
 *   pnpm exec playwright test --project=mobile
 *
 * Verifies the primary public flow is usable at 390px — no horizontal
 * scroll, the hamburger nav works, and the CTA is reachable.
 */
test.describe('TrueHire mobile (390px)', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, 'mobile-only checks');

  test('landing has no horizontal scroll and CTA is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // No sideways scroll at 390px.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);

    await expect(page.getByRole('link', { name: /claim your profile/i }).first()).toBeVisible();
  });

  test('hamburger menu opens nav links', async ({ page }) => {
    await page.goto('/');
    const burger = page.getByRole('button', { name: /open menu/i });
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.getByRole('link', { name: /how it works/i })).toBeVisible();
  });
});
