/**
 * Embed verification tests: component loaded via script tag (standalone bundle),
 * instantiated in DOM, config applied, DOM and behavior asserted.
 * Uses script-tag-example.html and e2e-test-page.html.
 */
import { test, expect } from '@playwright/test';

test.describe('Embed via script tag', () => {
  test('loads standalone JS and registers custom element', async ({ page }) => {
    await page.goto('/script-tag-example.html');
    const editor = page.locator('embeddable-code-editor#my-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveCount(1);
    // Custom element is defined and has shadow root when Lit has rendered
    const hasShadow = await editor.evaluate((el) => !!el.shadowRoot);
    expect(hasShadow).toBe(true);
  });

  test('applies config and shows file tree after DOMContentLoaded', async ({ page }) => {
    await page.goto('/script-tag-example.html');
    const editor = page.locator('embeddable-code-editor#my-editor');
    await expect(editor).toBeVisible();
    // Sidebar with file list (from config set in example script)
    const sidebar = editor.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(editor.locator('.file-item')).toHaveCount(4);
    await expect(editor.locator('text=src/index.ts')).toBeVisible();
    await expect(editor.locator('text=package.json')).toBeVisible();
  });

  test('shows code view for first file', async ({ page }) => {
    await page.goto('/script-tag-example.html');
    const editor = page.locator('embeddable-code-editor#my-editor');
    await expect(editor.locator('.code-area')).toBeVisible();
    await expect(editor.locator('.code-area')).toContainText('EmbeddableCodeEditor');
  });

  test('copy and download buttons are present and clickable', async ({ page }) => {
    await page.goto('/script-tag-example.html');
    const editor = page.locator('embeddable-code-editor#my-editor');
    const copyBtn = editor.getByTestId('copy-btn');
    const downloadBtn = editor.getByTestId('download-btn');
    await expect(copyBtn).toBeVisible();
    await expect(downloadBtn).toBeVisible();
    await copyBtn.click();
    await downloadBtn.click();
    // No crash; clipboard may require permission in some envs
  });
});
