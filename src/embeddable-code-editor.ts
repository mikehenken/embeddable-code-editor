import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { highlight } from './highlighter';
import { EditorConfig, EditorFile } from './types';

@customElement('embeddable-code-editor')
export class EmbeddableCodeEditor extends LitElement {
  static styles = css`
    /* Chief UX/UI design spec: Netflix aesthetic, high-contrast, drop shadows */
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      --sidebar-bg: #1a1d23;
      --sidebar-active: #2d3139;
      --sidebar-accent: #3b82f6;
      --code-bg: #1e1e1e;
      --toolbar-bg: #252830;
      --border-subtle: rgba(255,255,255,0.06);
      --text-muted: #94a3b8;
      --text-primary: #e2e8f0;
      --panel-bg: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      height: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }

    .container {
      display: flex;
      height: 100%;
      flex-direction: row;
    }

    .container.empty {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 14px;
    }

    .sidebar {
      width: 220px;
      min-width: 180px;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border-subtle);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .file-item {
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-muted);
      border-left: 3px solid transparent;
      transition: background 0.15s, color 0.15s;
    }

    .file-item:hover {
      background: var(--sidebar-active);
      color: var(--text-primary);
    }

    .file-item.active {
      background: var(--sidebar-active);
      color: var(--text-primary);
      font-weight: 500;
      border-left-color: var(--sidebar-accent);
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--code-bg);
    }

    .toolbar {
      display: flex;
      justify-content: flex-end;
      padding: 8px 12px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--border-subtle);
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      font-size: 13px;
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      background: rgba(255,255,255,0.05);
      color: var(--text-primary);
      border-radius: 6px;
      transition: background 0.15s;
    }

    button:hover {
      background: rgba(255,255,255,0.1);
    }

    .code-wrapper {
      flex: 1;
      overflow: auto;
      display: flex;
    }

    .line-numbers {
      min-width: 48px;
      padding: 16px 12px 16px 16px;
      background: #252526;
      color: #858585;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 13px;
      line-height: 1.6;
      text-align: right;
      user-select: none;
    }

    .code-area {
      flex: 1;
      overflow: auto;
      padding: 16px;
      margin: 0;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 14px;
      line-height: 1.6;
      tab-size: 4;
    }

    .code-area code {
      background: none;
      color: #d4d4d4;
    }

    /* Prism Tomorrow Night token colors (in shadow DOM) */
    .token.comment, .token.block-comment, .token.prolog, .token.doctype, .token.cdata { color: #6a9955; }
    .token.punctuation { color: #d4d4d4; }
    .token.tag, .token.attr-name, .token.namespace, .token.deleted { color: #e2777a; }
    .token.function-name { color: #6196cc; }
    .token.boolean, .token.number, .token.function { color: #f08d49; }
    .token.property, .token.class-name, .token.constant, .token.symbol { color: #f8c555; }
    .token.selector, .token.important, .token.atrule, .token.keyword, .token.builtin { color: #cc99cd; }
    .token.string, .token.char, .token.attr-value, .token.regex, .token.variable { color: #7ec699; }
    .token.operator, .token.entity, .token.url { color: #67cdcc; }
    .token.important, .token.bold { font-weight: bold; }
    .token.italic { font-style: italic; }

    .description-panel {
      padding: 12px 16px;
      background: var(--panel-bg);
      border-top: 1px solid var(--border-subtle);
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }
  `;

  @property({ type: Object })
  config: EditorConfig = { files: [] };

  @state()
  private activeFileIndex: number = 0;

  private get activeFile(): EditorFile | undefined {
    return this.config.files[this.activeFileIndex];
  }

  private selectFile(index: number) {
    this.activeFileIndex = index;
  }

  private async copyContent() {
    if (this.activeFile) {
      try {
        await navigator.clipboard.writeText(this.activeFile.content);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  }

  private downloadContent() {
    if (this.activeFile) {
      const blob = new Blob([this.activeFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.activeFile.path.split('/').pop() || 'download.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  render() {
    if (!this.config.files || this.config.files.length === 0) {
      return html`<div class="container empty">No files configured.</div>`;
    }

    const file = this.activeFile;
    if (!file) return html``;

    const highlightedCode = highlight(file.content, file.language || 'javascript');
    const lines = file.content.split('\n');
    const lineNumbers = lines.map((_, i) => i + 1).join('\n');

    return html`
      <div class="container">
        <div class="sidebar">
          ${this.config.files.map((f, i) => html`
            <div 
              class="file-item ${i === this.activeFileIndex ? 'active' : ''}"
              @click=${() => this.selectFile(i)}
              data-testid="file-item-${i}"
            >
              ${f.path}
            </div>
          `)}
        </div>
        <div class="main-area">
          <div class="toolbar">
            <button @click=${this.copyContent} data-testid="copy-btn">Copy</button>
            <button @click=${this.downloadContent} data-testid="download-btn">Download</button>
          </div>
          <div class="code-wrapper">
            <pre class="line-numbers" aria-hidden="true">${lineNumbers || '1'}</pre>
            <pre class="code-area"><code class="language-${file.language || 'javascript'}">${unsafeHTML(highlightedCode)}</code></pre>
          </div>
          ${file.description ? html`
            <div class="description-panel" data-testid="description-panel">
              ${file.description}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'embeddable-code-editor': EmbeddableCodeEditor;
  }
}