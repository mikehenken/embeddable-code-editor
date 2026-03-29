import { test, expect } from '@playwright/test';

/**
 * Mirrors an article with multiple editors; uses a static fixture so CI can serve
 * the repo root (port 3123) without a separate Next.js app on :3000.
 */
test('article-style page renders two embeddable editors with description', async ({
  page,
}) => {
  await page.goto('/e2e/fixtures/e2e-article-fixture.html');

  const editors = page.locator('embeddable-code-editor');
  await expect(editors).toHaveCount(2, { timeout: 10000 });

  const firstEditor = editors.nth(0);
  await expect(firstEditor).toBeVisible();

  const descriptionPanel = firstEditor.locator('.description-panel');
  await expect(descriptionPanel).toBeVisible({ timeout: 10000 });
});