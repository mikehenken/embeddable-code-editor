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

/** GitHub and other sources often use CRLF; strip BOM. Must run before splitting on `\n` or `\r` pollutes each line. */
export function normalizeEditorText(raw: string): string {
  let s = raw;
  if (s.length > 0 && s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1);
  }
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

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

export interface PrepareCodeViewOptions {
  /**
   * Highlight each line separately so the editor can use one row per logical line.
   * Required for `pre-wrap` layouts: a shared two-`pre` gutter cannot track wrapped line height.
   */
  perLine?: boolean;
}

export interface PrepareCodeViewResult {
  /** Full-file highlight for the side-by-side `pre` layout (no wrap). */
  highlightedHtml: string;
  /** Newline-separated line numbers for the side-by-side `pre` layout. */
  lineNumbersText: string;
  /** One HTML fragment per logical line when `perLine` was requested; otherwise `null`. */
  highlightedLineHtml: string[] | null;
}

function highlightLineSafe(line: string, language: string): string {
  if (line.length > MAX_PRISM_CHARS) {
    return escapeHtml(line);
  }
  try {
    return highlight(line, language);
  } catch {
    return escapeHtml(line);
  }
}

/**
 * Clamps size, builds line gutter text, and highlights safely for the embedded viewer.
 * Output is safe to pass to Lit's unsafeHTML when using the returned HTML string.
 */
export function prepareCodeView(
  raw: string,
  language: string = 'javascript',
  options?: PrepareCodeViewOptions,
): PrepareCodeViewResult {
  let text = normalizeEditorText(raw);
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

  if (options?.perLine) {
    const highlightedLineHtml = capped.map((line) => highlightLineSafe(line, language));
    return {
      highlightedHtml: '',
      lineNumbersText,
      highlightedLineHtml,
    };
  }

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
  return { highlightedHtml, lineNumbersText, highlightedLineHtml: null };
}