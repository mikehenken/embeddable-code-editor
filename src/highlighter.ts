import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

export function highlight(code: string, language: string = 'javascript'): string {
  const grammar = Prism.languages[language] || Prism.languages.javascript;
  return Prism.highlight(code, grammar, language);
}