import { describe, it, expect } from 'vitest';
import { highlight, prepareCodeView, normalizeEditorText } from './highlighter';

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

  it('prepareCodeView normalizes CRLF so lines do not carry stray carriage returns', () => {
    const r = prepareCodeView('{\r\n  "a": 1\r\n}\r\n', 'json', { perLine: true });
    // Trailing newline → final empty logical line
    expect(r.highlightedLineHtml).toHaveLength(4);
    for (const line of r.highlightedLineHtml ?? []) {
      expect(line).not.toContain('\r');
    }
  });

  it('normalizeEditorText strips BOM and normalizes newlines', () => {
    const bom = '\ufeff{"x":1}';
    expect(normalizeEditorText(bom)).toBe('{"x":1}');
    expect(normalizeEditorText('a\rb')).toBe('a\nb');
  });
});