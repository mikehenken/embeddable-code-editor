import { describe, it, expect } from 'vitest';
import { highlight, prepareCodeView } from './highlighter';

describe('highlighter', () => {
  it('highlights javascript by default', () => {
    const code = 'const x = 1;';
    const result = highlight(code);
    expect(result).toContain('<span class="token keyword">const</span>');
  });

  it('highlights specific languages', () => {
    const code = 'body { color: red; }';
    const result = highlight(code, 'css');
    expect(result).toContain('<span class="token property">color</span>');
  });

  it('prepareCodeView returns line numbers aligned with capped body', () => {
    const { lineNumbersText, highlightedHtml, highlightedLineHtml } = prepareCodeView('a\nb\nc', 'javascript');
    expect(lineNumbersText).toBe('1\n2\n3');
    expect(highlightedHtml.length).toBeGreaterThan(0);
    expect(highlightedLineHtml).toBeNull();
  });

  it('prepareCodeView with perLine returns one HTML fragment per logical line', () => {
    const r = prepareCodeView('const a = 1;\nconst b = 2;', 'javascript', { perLine: true });
    expect(r.highlightedLineHtml).toHaveLength(2);
    expect(r.highlightedLineHtml?.[0] ?? '').toContain('const');
    expect(r.highlightedLineHtml?.[1] ?? '').toContain('const');
    expect(r.highlightedHtml).toBe('');
  });
});