import { test, expect } from '@playwright/test';

test('remote URL loading', async ({ page }) => {
  await page.goto('/e2e/fixtures/remote-test-page.html');
  const editor = page.locator('embeddable-code-editor#remote-editor');
  await expect(editor).toBeVisible();

  const codeArea = editor.locator('.code-area');
  await expect(codeArea).toContainText('"name"', { timeout: 15000 });
  await expect(codeArea).toContainText('typescript', { timeout: 15000 });
});
