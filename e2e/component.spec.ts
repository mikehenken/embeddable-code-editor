/**
 * E2E tests: component mount, file tree, file selection, copy, download, description panel.
 * Uses built standalone bundle via e2e/fixtures/e2e-test-page.html.
 */
import { test, expect, type Locator } from '@playwright/test';

async function expandTreeFolder(editor: Locator, folderName: string): Promise<void> {
  await editor.locator('.tree-row.dir-row').getByText(folderName, { exact: true }).click();
}

test.describe('Component E2E', () => {
  test('component mounts and file tree is visible', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    await expect(editor).toBeVisible();
    const sidebar = editor.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(editor.locator('.tree-row.dir-row').getByText('src', { exact: true })).toBeVisible();
    await expect(editor.locator('.tree-row.file-row')).toHaveCount(1);
    await expect(editor.locator('text=README.md')).toBeVisible();
    await expandTreeFolder(editor, 'src');
    await expect(editor.locator('.tree-row.file-row')).toHaveCount(3);
    await expect(editor.locator('text=src/index.ts')).toBeVisible();
    await expect(editor.locator('text=src/example.js')).toBeVisible();
  });

  test('selecting a file switches code view', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const codeArea = editor.locator('.code-area');
    await expect(codeArea).toContainText('EmbeddableCodeEditor');
    await expandTreeFolder(editor, 'src');
    await editor.locator('[data-testid="file-item-1"]').click();
    await expect(codeArea).toContainText('hello');
    await expect(codeArea).toContainText('world');
    await editor.locator('[data-testid="file-item-2"]').click();
    await expect(codeArea).toContainText('# Project');
  });

  test('copy button is present and clickable', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const copyBtn = editor.getByTestId('copy-btn');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
  });

  test('download button is present and clickable', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const downloadBtn = editor.getByTestId('download-btn');
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
  });

  test('file description panel visible when descriptor present', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const descriptionPanel = editor.getByTestId('description-panel');
    await expect(descriptionPanel).toBeVisible();
    await expect(descriptionPanel).toContainText('Entry point; re-exports the web component.');
  });

  test('description panel hidden when selected file has no description', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    await expandTreeFolder(editor, 'src');
    await editor.locator('[data-testid="file-item-1"]').click();
    await expect(editor.getByTestId('description-panel')).not.toBeVisible();
  });

  test('theme toggle switches light/dark', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const themeBtn = editor.locator('[aria-label="Switch to light theme"]');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await expect(editor).toHaveAttribute('theme', 'light');
    await editor.locator('[aria-label="Switch to dark theme"]').click();
    await expect(editor).toHaveAttribute('theme', 'dark');
  });

  test('fullscreen toggle expands and exits', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    await editor.locator('[aria-label="Enter full screen"]').click();
    await expect(editor).toHaveAttribute('fullscreen', '');
    await editor.locator('[aria-label="Exit full screen"]').click();
    await expect(editor).not.toHaveAttribute('fullscreen', '');
  });

  test('download all produces source-code.zip', async ({ page }) => {
    await page.goto('/e2e/fixtures/e2e-test-page.html');
    const editor = page.locator('embeddable-code-editor#e2e-editor');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      editor.getByTestId('download-btn').click(),
    ]);
    expect(download.suggestedFilename()).toBe('source-code.zip');
  });
});
