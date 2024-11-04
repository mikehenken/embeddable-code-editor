import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './embeddable-code-editor';
import { EmbeddableCodeEditor } from './embeddable-code-editor';

describe('EmbeddableCodeEditor', () => {
  let element: EmbeddableCodeEditor;

  beforeEach(() => {
    element = document.createElement('embeddable-code-editor') as EmbeddableCodeEditor;
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('renders "No files configured" when empty', async () => {
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('No files configured');
  });

  it('renders files and switches active file', async () => {
    element.config = {
      files: [
        { path: 'file1.js', content: 'console.log(1);', description: 'First file' },
        { path: 'file2.css', content: 'body { margin: 0; }', language: 'css' }
      ]
    };
    await element.updateComplete;

    const sidebar = element.shadowRoot?.querySelector('.sidebar');
    expect(sidebar?.textContent).toContain('file1.js');
    expect(sidebar?.textContent).toContain('file2.css');

    const desc = element.shadowRoot?.querySelector('.description-panel');
    expect(desc?.textContent).toContain('First file');

    // Click second file
    const file2 = element.shadowRoot?.querySelector('[data-testid="file-item-1"]') as HTMLElement;
    file2.click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.description-panel')).toBeNull();
    const codeArea = element.shadowRoot?.querySelector('.code-area');
    expect(codeArea?.innerHTML).toContain('margin');
  });

  it('calls clipboard API on copy', async () => {
    element.config = {
      files: [{ path: 'test.js', content: 'test content' }]
    };
    await element.updateComplete;

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const copyBtn = element.shadowRoot?.querySelector('[data-testid="copy-btn"]') as HTMLElement;
    copyBtn.click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test content');
  });
});