import { describe, it, expect } from 'vitest';
import { highlight } from './highlighter';

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
});