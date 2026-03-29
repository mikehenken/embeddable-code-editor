import { test, expect } from '@playwright/test';

test('remote URL loading', async ({ page }) => {
  await page.goto('/e2e/fixtures/remote-test-page.html');
  const editor = page.locator('embeda-code#remote-editor');
  await expect(editor).toBeVisible();

  const codePane = editor.locator('.code-wrapper');
  await expect(codePane).toContainText('"name"', { timeout: 15000 });
  await expect(codePane).toContainText('typescript', { timeout: 15000 });
});
