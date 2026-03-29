/**
 * Embed verification tests: component loaded via script tag (standalone bundle),
 * instantiated in DOM, config applied, DOM and behavior asserted.
 * Uses examples/script-tag-example.html (served from repo root).
 */
import { test, expect } from '@playwright/test';

/** GitHub API + fetch can be slow; unauthenticated calls are rate-limited. */
const GITHUB_LOAD_MS = 60_000;

test.describe('Embed via script tag', () => {
  test.describe.configure({ timeout: GITHUB_LOAD_MS + 30_000 });
  test('loads standalone JS and registers custom element', async ({ page }) => {
    await page.goto('/examples/script-tag-example.html');
    const editor = page.locator('embeda-code#my-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveCount(1);
    // Custom element is defined and has shadow root when Lit has rendered
    const hasShadow = await editor.evaluate((el) => !!el.shadowRoot);
    expect(hasShadow).toBe(true);
  });

  test('loads GitHub repo tree (microsoft/TypeScript)', async ({ page }) => {
    await page.goto('/examples/script-tag-example.html');
    const editor = page.locator('embeda-code#my-editor');
    await expect(editor).toBeVisible();
    const sidebar = editor.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(editor.getByTestId('sidebar-header')).toContainText('microsoft/TypeScript', {
      timeout: GITHUB_LOAD_MS,
    });
    await expect(editor.locator('.tree-row.file-row').first()).toBeVisible({
      timeout: GITHUB_LOAD_MS,
    });
    await expect(editor.getByText('core.ts', { exact: true }).first()).toBeVisible({
      timeout: GITHUB_LOAD_MS,
    });
  });

  test('shows code view for default file (src/compiler/core.ts)', async ({ page }) => {
    await page.goto('/examples/script-tag-example.html');
    const editor = page.locator('embeda-code#my-editor');
    const code = editor.locator('.code-wrapper');
    await expect(code).toBeVisible({ timeout: GITHUB_LOAD_MS });
    // Stable substring from the real file on main (see raw file on GitHub)
    await expect(code).toContainText('emptyArray', { timeout: GITHUB_LOAD_MS });
  });

  test('copy and download buttons are present and clickable', async ({ page }) => {
    await page.goto('/examples/script-tag-example.html');
    const editor = page.locator('embeda-code#my-editor');
    const copyBtn = editor.getByTestId('copy-btn');
    const downloadBtn = editor.getByTestId('download-btn');
    await expect(copyBtn).toBeVisible();
    await expect(downloadBtn).toBeVisible();
    await copyBtn.click();
    await downloadBtn.click();
    // No crash; clipboard may require permission in some envs
  });
});
