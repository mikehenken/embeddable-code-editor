import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as GitHub from '../github/github-fetcher';
import './embeddable-code-editor';
import { EmbeddableCodeEditor } from './embeddable-code-editor';

function codePaneText(root: ShadowRoot | null | undefined): string {
  if (!root) {
    return '';
  }
  const cells = root.querySelector('.code-scroll-body--rows')?.querySelectorAll('.line-code-cell');
  if (cells && cells.length > 0) {
    return Array.from(cells)
      .map((n) => n.textContent ?? '')
      .join('\n');
  }
  return root.querySelector('.code-area')?.textContent ?? '';
}

function codePaneHtml(root: ShadowRoot | null | undefined): string {
  if (!root) {
    return '';
  }
  const cells = root.querySelector('.code-scroll-body--rows')?.querySelectorAll('.line-code-cell');
  if (cells && cells.length > 0) {
    return Array.from(cells)
      .map((n) => n.innerHTML)
      .join('');
  }
  return root.querySelector('.code-area')?.innerHTML ?? '';
}

describe('EmbeddableCodeEditor', () => {
  let element: EmbeddableCodeEditor;

  beforeEach(() => {
    element = document.createElement('embeddable-code-editor') as EmbeddableCodeEditor;
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('renders "No files configured" when empty', async () => {
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('No files configured');
  });

  it('renders files and switches active file', async () => {
    element.config = {
      files: [
        { path: 'file1.js', content: 'console.log(1);', description: 'First file' },
        { path: 'file2.css', content: 'body { margin: 0; }', language: 'css' },
      ],
    };
    await element.updateComplete;

    const sidebar = element.shadowRoot?.querySelector('.sidebar');
    expect(sidebar?.textContent).toContain('file1.js');
    expect(sidebar?.textContent).toContain('file2.css');

    const desc = element.shadowRoot?.querySelector('.description-panel');
    expect(desc?.textContent).toContain('First file');

    const file2 = element.shadowRoot?.querySelector('[data-testid="file-item-1"]') as HTMLElement;
    file2.click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.description-panel')).toBeNull();
    expect(codePaneHtml(element.shadowRoot)).toContain('margin');
  });

  it('hides description panel when showFileDescription is false', async () => {
    element.config = {
      showFileDescription: false,
      files: [{ path: 'a.js', content: 'x', description: 'Hidden' }],
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.description-panel')).toBeNull();
  });

  it('calls clipboard API on copy', async () => {
    element.config = {
      files: [{ path: 'test.js', content: 'test content' }],
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

  it('fetches and displays remote content when file.content is a URL', async () => {
    const remoteContent = 'function remote() { return true; }';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(remoteContent),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    element.config = {
      files: [{ path: 'remote.js', content: 'https://example.com/remote.js', language: 'javascript' }],
    };
    await element.updateComplete;
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 30));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/remote.js',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(codePaneText(element.shadowRoot)).toContain('remote');
    expect(codePaneText(element.shadowRoot)).not.toContain('Loading...');
  });

  it('refetches remote file when revisiting after switch (default remoteCacheMaxEntries)', async () => {
    const urlA = 'https://example.com/a.ts';
    const urlB = 'https://example.com/b.ts';
    let fetchesA = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url === urlA) {
        fetchesA += 1;
      }
      const body = url === urlA ? 'content-A' : 'content-B';
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(body),
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    element.config = {
      files: [
        { path: 'a.ts', content: urlA, language: 'typescript' },
        { path: 'b.ts', content: urlB, language: 'typescript' },
      ],
    };
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchesA).toBe(1);

    (element.shadowRoot?.querySelector('[data-testid="file-item-1"]') as HTMLElement).click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));

    (element.shadowRoot?.querySelector('[data-testid="file-item-0"]') as HTMLElement).click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchesA).toBe(2);
  });

  it('keeps remote bodies in LRU when remoteCacheMaxEntries > 1', async () => {
    const urlA = 'https://example.com/a.ts';
    const urlB = 'https://example.com/b.ts';
    let fetchesA = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url === urlA) {
        fetchesA += 1;
      }
      const body = url === urlA ? 'content-A' : 'content-B';
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(body),
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    element.config = {
      remoteCacheMaxEntries: 4,
      files: [
        { path: 'a.ts', content: urlA, language: 'typescript' },
        { path: 'b.ts', content: urlB, language: 'typescript' },
      ],
    };
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchesA).toBe(1);

    (element.shadowRoot?.querySelector('[data-testid="file-item-1"]') as HTMLElement).click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));

    (element.shadowRoot?.querySelector('[data-testid="file-item-0"]') as HTMLElement).click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchesA).toBe(1);
  });

  it('shows error message when remote URL fetch fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    globalThis.fetch = fetchMock as typeof fetch;

    element.config = {
      files: [{ path: 'bad.js', content: 'https://example.com/bad.js', language: 'javascript' }],
    };
    await element.updateComplete;
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 30));

    expect(codePaneText(element.shadowRoot)).toContain('Error loading content');
    expect(codePaneText(element.shadowRoot)).toContain('404');
  });

  it('shows error when remote URL fetch throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = fetchMock as typeof fetch;

    element.config = {
      files: [{ path: 'throw.js', content: 'https://example.com/throw.js', language: 'javascript' }],
    };
    await element.updateComplete;
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 30));

    expect(codePaneText(element.shadowRoot)).toContain('Error loading content');
    expect(codePaneText(element.shadowRoot)).toContain('Network error');
  });

  it('toggles fullscreen on button click (expand and exit)', async () => {
    element.config = {
      files: [{ path: 'a.js', content: 'x', language: 'javascript' }],
    };
    await element.updateComplete;

    expect(element.fullscreen).toBe(false);

    const enterBtn = element.shadowRoot?.querySelector('[aria-label="Enter full screen"]') as HTMLElement;
    expect(enterBtn).toBeTruthy();
    enterBtn.click();
    await element.updateComplete;
    expect(element.fullscreen).toBe(true);

    const exitBtn = element.shadowRoot?.querySelector('[aria-label="Exit full screen"]') as HTMLElement;
    expect(exitBtn).toBeTruthy();
    exitBtn.click();
    await element.updateComplete;
    expect(element.fullscreen).toBe(false);
  });

  it('reflects fullscreen attribute when toggled', async () => {
    element.config = { files: [{ path: 'a.js', content: 'x' }] };
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('[aria-label="Enter full screen"]') as HTMLElement;
    btn.click();
    await element.updateComplete;
    expect(element.getAttribute('fullscreen')).toBe('');
  });

  it('toggles theme (light/dark) on button click', async () => {
    const getItem = vi.fn().mockReturnValue(null);
    const setItem = vi.fn();
    Object.defineProperty(window, 'localStorage', { value: { getItem, setItem }, writable: true });

    element.config = { files: [{ path: 'a.js', content: 'x' }] };
    await element.updateComplete;

    const switchToLight = element.shadowRoot?.querySelector('[aria-label="Switch to light theme"]') as HTMLElement;
    expect(switchToLight).toBeTruthy();
    switchToLight.click();
    await element.updateComplete;
    expect(element.theme).toBe('light');
    expect(setItem).toHaveBeenCalledWith('embeddable-code-editor-theme', 'light');

    const switchToDark = element.shadowRoot?.querySelector('[aria-label="Switch to dark theme"]') as HTMLElement;
    switchToDark.click();
    await element.updateComplete;
    expect(element.theme).toBe('dark');
    expect(setItem).toHaveBeenCalledWith('embeddable-code-editor-theme', 'dark');
  });

  it('persists theme to localStorage when toggled', async () => {
    const setItem = vi.fn();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem },
      writable: true,
    });

    element.config = { files: [{ path: 'a.js', content: 'x' }] };
    await element.updateComplete;
    const themeBtn = element.shadowRoot?.querySelector('[aria-label="Switch to light theme"]') as HTMLElement;
    themeBtn.click();
    await element.updateComplete;
    expect(setItem).toHaveBeenCalledWith('embeddable-code-editor-theme', 'light');
  });

  it('reflects theme attribute when theme is light', async () => {
    element.theme = 'light';
    element.config = { files: [{ path: 'a.js', content: 'x' }] };
    await element.updateComplete;
    expect(element.getAttribute('theme')).toBe('light');
  });

  it('download-all builds zip and triggers download (createObjectURL and anchor click)', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    element.config = {
      files: [
        { path: 'a.js', content: 'const a = 1;' },
        { path: 'b/c.txt', content: 'hello' },
      ],
    };
    await element.updateComplete;

    const downloadBtn = element.shadowRoot?.querySelector('[data-testid="download-btn"]') as HTMLElement;
    downloadBtn.click();
    await new Promise((r) => setTimeout(r, 120));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(blob instanceof Blob).toBe(true);

    const appended = appendSpy.mock.calls.find((c) => (c[0] as HTMLElement)?.tagName === 'A');
    expect(appended).toBeDefined();
    const anchor = appended?.[0] as HTMLAnchorElement;
    expect(anchor?.download).toBe('source-code.zip');
    expect(anchor?.href).toContain('blob:');

    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('download-all with inline files includes all file paths in zip', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });

    element.config = {
      files: [
        { path: 'src/index.js', content: 'export {}' },
        { path: 'readme.md', content: '# Hi' },
      ],
    };
    await element.updateComplete;
    const downloadBtn = element.shadowRoot?.querySelector('[data-testid="download-btn"]') as HTMLElement;
    downloadBtn.click();
    await new Promise((r) => setTimeout(r, 120));

    expect(createObjectURL).toHaveBeenCalled();
    const blob = (createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blob.size).toBeGreaterThan(0);
  });

  it('opens defaultFile when set', async () => {
    element.config = {
      defaultFile: 'README.md',
      files: [
        { path: 'a.js', content: 'aaa' },
        { path: 'README.md', content: '# Doc body' },
      ],
    };
    await element.updateComplete;
    expect(codePaneText(element.shadowRoot)).toContain('Doc body');
    expect(codePaneText(element.shadowRoot)).not.toContain('aaa');
  });

  it('uses README.md first when repoUrl is set and defaultFile is unset', async () => {
    vi.spyOn(GitHub, 'fetchGitHubRepo').mockResolvedValue([
      { path: '0.txt', content: 'zero' },
      { path: 'README.md', content: '# From repo' },
    ]);
    element.config = { repoUrl: 'https://github.com/owner/repo' };
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 80));
    await element.updateComplete;
    expect(codePaneText(element.shadowRoot)).toContain('From repo');
    expect(codePaneText(element.shadowRoot)).not.toContain('zero');
  });

  it('uses per-line row layout when wordWrap is true so gutters track wrapped lines', async () => {
    element.config = { files: [{ path: 'x.js', content: 'line1\nline2' }] };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.code-scroll-body--rows')).toBeTruthy();
    expect(element.shadowRoot?.querySelectorAll('.code-line-row').length).toBe(2);
    expect(element.shadowRoot?.querySelector('.code-area')).toBeNull();
  });

  it('uses dual-pre layout with nowrap when wordWrap is false', async () => {
    element.config = { wordWrap: false, files: [{ path: 'x.js', content: 'y' }] };
    await element.updateComplete;
    const pre = element.shadowRoot?.querySelector('.code-area');
    expect(pre?.classList.contains('code-area--nowrap')).toBe(true);
    expect(element.shadowRoot?.querySelector('.code-scroll-body--rows')).toBeNull();
  });
});
