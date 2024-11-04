/**
 * E2E tests: component mount, file tree, file selection, copy, download, description panel.
 * Uses built standalone bundle via e2e-test-page.html (and script-tag-example.html where needed).
 */
import { test, expect } from '@playwright/test';

test.describe('Component E2E', () => {
  test('component mounts and file tree is visible', async ({ page }) => {
    await page.goto('/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    await expect(editor).toBeVisible();
    const sidebar = editor.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(editor.locator('.file-item')).toHaveCount(3);
    await expect(editor.locator('text=src/index.ts')).toBeVisible();
    await expect(editor.locator('text=src/example.js')).toBeVisible();
    await expect(editor.locator('text=README.md')).toBeVisible();
  });

  test('selecting a file switches code view', async ({ page }) => {
    await page.goto('/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const codeArea = editor.locator('.code-area');
    await expect(codeArea).toContainText('EmbeddableCodeEditor');
    await editor.locator('[data-testid="file-item-1"]').click();
    await expect(codeArea).toContainText('hello');
    await expect(codeArea).toContainText('world');
    await editor.locator('[data-testid="file-item-2"]').click();
    await expect(codeArea).toContainText('# Project');
  });

  test('copy button is present and clickable', async ({ page }) => {
    await page.goto('/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const copyBtn = editor.getByTestId('copy-btn');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
  });

  test('download button is present and clickable', async ({ page }) => {
    await page.goto('/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const downloadBtn = editor.getByTestId('download-btn');
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
  });

  test('file description panel visible when descriptor present', async ({ page }) => {
    await page.goto('/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const descriptionPanel = editor.getByTestId('description-panel');
    await expect(descriptionPanel).toBeVisible();
    await expect(descriptionPanel).toContainText('Entry point; re-exports the web component.');
  });

  test('description panel hidden when selected file has no description', async ({ page }) => {
    await page.goto('/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    await editor.locator('[data-testid="file-item-1"]').click();
    await expect(editor.getByTestId('description-panel')).not.toBeVisible();
  });
});
