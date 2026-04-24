import { expect, test } from "@playwright/test";

test.describe("TrueHire smoke", () => {
  test("landing renders hero + CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/resume|work/i);
    await expect(page.getByRole("link", { name: /claim your profile/i }).first()).toBeVisible();
  });

  test("login page shows sign-in affordance", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
  });

  test("unknown @handle renders custom 404", async ({ page }) => {
    const res = await page.goto("/@__nobody__");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/profile hasn/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /claim a profile/i })).toBeVisible();
  });

  test("bare /handle (no @) does not render a profile", async ({ page }) => {
    const res = await page.goto("/somebody");
    expect(res?.status()).toBe(404);
  });

  test("OG image route returns png", async ({ request }) => {
    const res = await request.get("/api/og/sample");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("image");
  });
});
