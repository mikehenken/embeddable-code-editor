import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

/** Raw bytes shown before hard truncation (avoids multi‑MB Prism / line-number DOM blowups). */
const MAX_VIEW_BYTES = 450_000;
/** Max lines after byte cap (second guard for pathological single-line files). */
const MAX_VIEW_LINES = 12_000;
/** Above this, skip Prism tokenization and escape as plain text (Prism can hang on huge input). */
const MAX_PRISM_CHARS = 200_000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlight(code: string, language: string = 'javascript'): string {
  const grammar = Prism.languages[language] || Prism.languages.javascript;
  return Prism.highlight(code, grammar, language);
}

/**
 * Clamps size, builds line gutter text, and highlights safely for the embedded viewer.
 * Output is safe to pass to Lit's unsafeHTML when using the returned HTML string.
 */
export function prepareCodeView(raw: string, language: string = 'javascript'): {
  highlightedHtml: string;
  lineNumbersText: string;
} {
  let text = raw;
  if (text.length > MAX_VIEW_BYTES) {
    text =
      text.slice(0, MAX_VIEW_BYTES) +
      '\n\n// [Truncated: file exceeds embedded viewer size limit.]';
  }
  const lines = text.split('\n');
  const capped =
    lines.length > MAX_VIEW_LINES
      ? [...lines.slice(0, MAX_VIEW_LINES), '// [Truncated: too many lines for embedded viewer.]']
      : lines;
  const body = capped.join('\n');
  const lineNumbersText = capped.map((_, i) => String(i + 1)).join('\n');

  let highlightedHtml: string;
  if (body.length > MAX_PRISM_CHARS) {
    highlightedHtml = escapeHtml(body);
  } else {
    try {
      highlightedHtml = highlight(body, language);
    } catch {
      highlightedHtml = escapeHtml(body);
    }
  }
  return { highlightedHtml, lineNumbersText };
}