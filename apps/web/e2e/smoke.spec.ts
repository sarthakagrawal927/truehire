import { expect, test } from '@playwright/test';

test.describe('TrueHire smoke', () => {
  test('landing presents an archive instead of an active signup', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/hiring-signal experiment/i);
    await expect(page.getByText(/archived research artifact/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /inspect the methodology/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /claim your profile/i })).toHaveCount(0);
  });

  test('sample profile keeps the archived boundary', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText(/archived sample/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /view retained proof/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /claim your profile/i })).toHaveCount(0);
  });

  test('login page shows sign-in affordance', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
  });

  test('unknown @handle renders custom 404', async ({ page }) => {
    const res = await page.goto('/@__nobody__');
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/profile hasn/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /claim a profile/i })).toBeVisible();
  });

  test('bare /handle (no @) does not render a profile', async ({ page }) => {
    const res = await page.goto('/somebody');
    expect(res?.status()).toBe(404);
  });

  test('archive OG image route returns png without profile data', async ({ request }) => {
    const res = await request.get('/opengraph-image');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('image');
  });
});
