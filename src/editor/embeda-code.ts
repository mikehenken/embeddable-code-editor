import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import JSZip from 'jszip';
import { prepareCodeView } from '../highlight/highlighter';
import { fetchGitHubRepo, MAX_REPO_FILES_FROM_API } from '../github/github-fetcher';
import type { EditorConfig, EditorFile } from '../types';
import {
  buildFileTree,
  filterTreeNodes,
  initialExpandedDirKeys,
  isRemoteContentString,
  mergeFileLists,
  normalizePath,
  parentDirKeysForFilePath,
  resolveInitialFileIndex,
  type TreeNode,
} from '../tree/file-tree';

const THEME_STORAGE_KEY = 'embedacode-theme';

/** After merge with local `files` overrides, hard cap (matches API cap by default). */
const MAX_MERGED_REPO_FILES = MAX_REPO_FILES_FROM_API;

@customElement('embeda-code')
export class EmbedaCode extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      /* One chrome strip: repo header + editor toolbar share bg + bottom rule */
      --chrome-bg: #161b22;
      --chrome-border: #30363d;
      --shell-bg: #0d1117;
      --sidebar-bg: var(--shell-bg);
      --sidebar-active: #21262d;
      --sidebar-active-strong: #30363d;
      --sidebar-accent: #388bfd;
      --tree-icon-muted: #7d8590;
      --tree-text: #e6edf3;
      --code-bg: var(--shell-bg);
      --line-gutter-bg: #161b22;
      --toolbar-bg: var(--chrome-bg);
      --border-subtle: #30363d;
      --text-muted: #8b949e;
      --text-primary: #e6edf3;
      --panel-bg: #161b22;
      border-radius: 12px;
      overflow: hidden;
      height: 400px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    }

    :host([theme='light']) {
      --chrome-bg: #f6f8fa;
      --chrome-border: #d0d7de;
      --shell-bg: #ffffff;
      --sidebar-bg: var(--shell-bg);
      --sidebar-active: #eaeef2;
      --sidebar-active-strong: #d0d7de;
      --sidebar-accent: #0969da;
      --tree-icon-muted: #57606a;
      --tree-text: #1f2328;
      --code-bg: var(--shell-bg);
      --line-gutter-bg: #f6f8fa;
      --toolbar-bg: var(--chrome-bg);
      --border-subtle: #d0d7de;
      --text-muted: #57606a;
      --text-primary: #1f2328;
      --panel-bg: #f6f8fa;
    }

    :host([fullscreen]) {
      position: fixed;
      inset: 0;
      z-index: 99999;
      height: 100vh !important;
      border-radius: 0;
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
      padding: 16px;
      text-align: center;
    }

    .sidebar {
      width: 260px;
      min-width: 200px;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--chrome-border);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .sidebar-header {
      flex-shrink: 0;
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 12px;
      background: var(--chrome-bg);
      border-bottom: 1px solid var(--chrome-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .sidebar-header-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--tree-text);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-header-link {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      color: var(--tree-icon-muted);
    }

    .sidebar-header-link a {
      color: inherit;
      display: flex;
      align-items: center;
    }

    .sidebar-header-link a:hover {
      color: var(--sidebar-accent);
    }

    .tree-search-wrap {
      flex-shrink: 0;
      box-sizing: border-box;
      padding: 12px;
      border-bottom: 1px solid var(--chrome-border);
    }

    .tree-search-input {
      width: 100%;
      box-sizing: border-box;
      display: block;
      margin: 0;
      padding: 8px 12px;
      font-size: 12px;
      line-height: 1.45;
      border-radius: 6px;
      border: 1px solid var(--chrome-border);
      background: var(--shell-bg);
      color: var(--tree-text);
      outline: none;
    }

    .tree-search-input::placeholder {
      color: var(--tree-icon-muted);
    }

    .tree-search-input:focus {
      border-color: var(--sidebar-accent);
      box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.2);
    }

    :host([theme='light']) .tree-search-input:focus {
      box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.2);
    }

    .tree-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 8px 12px 12px;
      box-sizing: border-box;
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 28px;
      padding: 2px 8px 2px 6px;
      margin: 1px 0;
      border-radius: 6px;
      border-left: 3px solid transparent;
      cursor: pointer;
      font-size: 12px;
      line-height: 1.35;
      color: var(--tree-text);
      user-select: none;
      transition: background 0.12s ease;
    }

    .tree-row:hover {
      background: var(--sidebar-active);
    }

    .tree-row.is-active {
      background: var(--sidebar-active-strong);
      border-left-color: var(--sidebar-accent);
      font-weight: 500;
    }

    .tree-chevron-slot {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tree-chevron-svg {
      color: var(--tree-icon-muted);
      transition: transform 0.15s ease;
    }

    .tree-chevron-svg.is-open {
      transform: rotate(90deg);
    }

    .tree-row-icon {
      flex-shrink: 0;
      color: var(--tree-icon-muted);
    }

    .tree-row.is-active .tree-row-icon {
      color: var(--sidebar-accent);
    }

    .tree-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--code-bg);
    }

    .toolbar {
      flex-shrink: 0;
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--chrome-bg);
      border-bottom: 1px solid var(--chrome-border);
      gap: 8px;
    }

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button.icon-btn {
      padding: 6px 10px;
      min-width: 36px;
    }

    button {
      padding: 6px 12px;
      font-size: 13px;
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      border-radius: 6px;
      transition: background 0.15s;
    }

    :host([theme='light']) button {
      background: rgba(0, 0, 0, 0.04);
    }

    button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    :host([theme='light']) button:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    /* Single scroll surface; line + code share full height background */
    .code-wrapper {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      align-items: stretch;
      background: var(--code-bg);
    }

    /*
     * Word wrap + aligned gutters: CSS Grid, one row per logical line.
     * References: https://jaseg.de/blog/css-only-code-blocks/
     * and https://stackoverflow.com/questions/43962371/align-code-line-numbers-with-css
     * Lit: no whitespace text nodes between .code-grid-lineno and .code-grid-line (breaks the grid).
     */
    .code-grid {
      display: grid;
      grid-template-columns: minmax(min-content, max-content) minmax(0, 1fr);
      grid-auto-rows: minmax(min-content, auto);
      width: 100%;
      box-sizing: border-box;
      min-height: 100%;
      padding: 12px 0 16px;
      align-items: stretch;
      column-gap: 0;
      row-gap: 0;
      background: var(--code-bg);
    }

    .code-grid-lineno {
      box-sizing: border-box;
      margin: 0;
      padding: 0 10px 0 18px;
      min-width: calc(var(--line-gutter-digits, 3) * 1ch + 28px);
      color: #858585;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 14px;
      line-height: 1.6;
      user-select: none;
      text-align: right;
      background: var(--line-gutter-bg);
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
    }

    :host([theme='light']) .code-grid-lineno {
      color: #6b7280;
    }

    .code-grid-line {
      box-sizing: border-box;
      margin: 0;
      min-width: 0;
      padding: 0 20px 0 14px;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 14px;
      line-height: 1.6;
      tab-size: 4;
      background: var(--code-bg);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .code-grid-line code {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
      background: none;
      color: #d4d4d4;
      white-space: inherit;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      tab-size: inherit;
    }

    /* Prism tokens must not shift line metrics vs. the gutter */
    .code-grid-line .token {
      line-height: inherit;
      font-size: inherit;
      font-family: inherit;
    }

    :host([theme='light']) .code-grid-line code {
      color: #1e1e1e;
    }

    .line-numbers {
      flex-shrink: 0;
      margin: 0;
      padding: 12px 16px 16px 18px;
      background: var(--line-gutter-bg);
      color: #858585;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 13px;
      line-height: 1.6;
      text-align: right;
      user-select: none;
    }

    :host([theme='light']) .line-numbers {
      color: #6b7280;
    }

    .code-area {
      flex: 1;
      min-width: 0;
      margin: 0;
      padding: 12px 20px 16px 14px;
      overflow: visible;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 14px;
      line-height: 1.6;
      tab-size: 4;
      background: var(--code-bg);
    }

    .code-area code {
      background: none;
      color: #d4d4d4;
    }

    :host([theme='light']) .code-area code {
      color: #1e1e1e;
    }

    .code-area--nowrap,
    .code-area--nowrap code {
      white-space: pre;
    }

    .line-numbers--nowrap {
      white-space: pre;
    }

    .token.comment,
    .token.block-comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: #6a9955;
    }
    .token.punctuation {
      color: #d4d4d4;
    }
    .token.tag,
    .token.attr-name,
    .token.namespace,
    .token.deleted {
      color: #e2777a;
    }
    .token.function-name {
      color: #6196cc;
    }
    .token.boolean,
    .token.number,
    .token.function {
      color: #f08d49;
    }
    .token.property,
    .token.class-name,
    .token.constant,
    .token.symbol {
      color: #f8c555;
    }
    .token.selector,
    .token.important,
    .token.atrule,
    .token.keyword,
    .token.builtin {
      color: #cc99cd;
    }
    .token.string,
    .token.char,
    .token.attr-value,
    .token.regex,
    .token.variable {
      color: #7ec699;
    }
    .token.operator,
    .token.entity,
    .token.url {
      color: #67cdcc;
    }
    .token.important,
    .token.bold {
      font-weight: bold;
    }
    .token.italic {
      font-style: italic;
    }

    .description-panel {
      flex-shrink: 0;
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

  @property({ type: String, reflect: true })
  theme: 'light' | 'dark' = 'dark';

  @property({ type: Boolean, reflect: true })
  fullscreen = false;

  @state()
  private activeFileIndex = 0;

  @state()
  private _files: EditorFile[] = [];

  @state()
  private repoLoading = false;

  @state()
  private _repoError: string | null = null;

  @state()
  private expandedDirs: Set<string> = new Set();

  @state()
  private treeFilter = '';

  /** Cached tree for sidebar; avoids rebuilding on every render for large repos. */
  private treeNodes: TreeNode[] = [];

  private loadSeq = 0;

  private resolvedContent = new Map<number, string>();

  /** LRU order for remote bodies (oldest first); only used when remoteCacheMaxEntries > 1. */
  private resolvedLruOrder: number[] = [];

  /** Abandoned when the user selects another file so in-flight raw fetches cannot pile up. */
  private contentFetchAbort: AbortController | null = null;

  private boundKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.fullscreen) {
      this.fullscreen = false;
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.applyThemePreference();
    window.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.boundKeyDown);
    this.abortPendingContentFetch();
  }

  private abortPendingContentFetch(): void {
    this.contentFetchAbort?.abort();
    this.contentFetchAbort = null;
  }

  private applyThemePreference(): void {
    const attr = this.getAttribute('theme');
    if (attr === 'light' || attr === 'dark') {
      this.theme = attr;
      return;
    }
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        this.theme = stored;
        return;
      }
    } catch {
      /* private mode */
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      this.theme = 'light';
    } else {
      this.theme = 'dark';
    }
  }

  private syncTreeFromFiles(): void {
    this.treeNodes = buildFileTree(this._files);
  }

  private applyInitialFileSelection(): void {
    if (this._files.length === 0) {
      this.activeFileIndex = 0;
      return;
    }
    const idx = resolveInitialFileIndex(this._files, this.config);
    this.activeFileIndex = idx;
    const path = this._files[idx]?.path;
    if (!path) {
      return;
    }
    const keys = parentDirKeysForFilePath(path);
    if (keys.length === 0) {
      return;
    }
    const next = new Set(this.expandedDirs);
    for (const k of keys) {
      next.add(k);
    }
    this.expandedDirs = next;
  }

  private isWordWrap(): boolean {
    return this.config.wordWrap !== false;
  }

  private treeFilterActive(): boolean {
    return this.treeFilter.trim().length > 0;
  }

  private visibleTreeNodes(): TreeNode[] {
    return filterTreeNodes(this.treeNodes, this.treeFilter);
  }

  private getRemoteCacheMaxEntries(): number {
    const raw = this.config.remoteCacheMaxEntries;
    if (raw === undefined || raw === null) {
      return 1;
    }
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.min(n, 256);
  }

  private resetRemoteContentCache(): void {
    this.resolvedContent = new Map();
    this.resolvedLruOrder = [];
  }

  private touchRemoteCache(idx: number): void {
    if (this.getRemoteCacheMaxEntries() <= 1 || !this.resolvedContent.has(idx)) {
      return;
    }
    this.resolvedLruOrder = this.resolvedLruOrder.filter((i) => i !== idx);
    this.resolvedLruOrder.push(idx);
  }

  private storeResolvedRemote(idx: number, text: string): void {
    const max = this.getRemoteCacheMaxEntries();
    if (max === 1) {
      this.resolvedContent.clear();
      this.resolvedContent.set(idx, text);
      this.resolvedLruOrder = [];
      return;
    }
    this.resolvedContent.set(idx, text);
    this.resolvedLruOrder = this.resolvedLruOrder.filter((i) => i !== idx);
    this.resolvedLruOrder.push(idx);
    while (this.resolvedLruOrder.length > max) {
      const evict = this.resolvedLruOrder.shift();
      if (evict !== undefined) {
        this.resolvedContent.delete(evict);
      }
    }
  }

  private handleConfigChanged(): void {
    this.abortPendingContentFetch();
    const cfg = this.config;
    this.resetRemoteContentCache();
    this.loadSeq++;

    if (!cfg.repoUrl) {
      this._files = [...(cfg.files ?? [])];
      this._repoError = null;
      this.repoLoading = false;
      this.syncTreeFromFiles();
      this.expandedDirs = initialExpandedDirKeys();
      this.applyInitialFileSelection();
      return;
    }

    this.repoLoading = true;
    this._repoError = null;
    this._files = [];
    this.syncTreeFromFiles();
    this.expandedDirs = initialExpandedDirKeys();
    const seq = this.loadSeq;

    void (async () => {
      try {
        const branchOrTag = cfg.tag ?? cfg.branch ?? 'main';
        const remoteList = await fetchGitHubRepo(cfg.repoUrl!, branchOrTag);
        if (seq !== this.loadSeq) {
          return;
        }
        let merged = mergeFileLists(remoteList, cfg.files ?? []);
        if (merged.length > MAX_MERGED_REPO_FILES) {
          merged = merged.slice(0, MAX_MERGED_REPO_FILES);
        }
        this._files = merged;
        this._repoError = null;
      } catch (e) {
        if (seq !== this.loadSeq) {
          return;
        }
        this._repoError = e instanceof Error ? e.message : String(e);
        this._files = [...(cfg.files ?? [])];
      } finally {
        if (seq === this.loadSeq) {
          this.repoLoading = false;
          this.syncTreeFromFiles();
          this.expandedDirs = initialExpandedDirKeys();
          this.applyInitialFileSelection();
          this.requestUpdate();
        }
      }
    })();
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('config')) {
      this.handleConfigChanged();
    }
  }

  override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('activeFileIndex') || changed.has('_files')) {
      void this.ensureActiveFileResolved();
    }
  }

  private async ensureActiveFileResolved(): Promise<void> {
    const file = this._files[this.activeFileIndex];
    if (!file || !isRemoteContentString(file.content)) {
      return;
    }
    const idx = this.activeFileIndex;
    if (this.resolvedContent.has(idx)) {
      this.touchRemoteCache(idx);
      return;
    }

    this.abortPendingContentFetch();
    const ac = new AbortController();
    this.contentFetchAbort = ac;

    try {
      const res = await fetch(file.content, { signal: ac.signal });
      if (!res.ok) {
        this.storeResolvedRemote(
          idx,
          `// Error loading content: ${String(res.status)} ${res.statusText}`,
        );
      } else {
        this.storeResolvedRemote(idx, await res.text());
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      if (e !== null && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'AbortError') {
        return;
      }
      this.storeResolvedRemote(
        idx,
        `// Error loading content: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      if (this.contentFetchAbort === ac) {
        this.contentFetchAbort = null;
      }
    }

    if (this.activeFileIndex === idx) {
      this.requestUpdate();
    }
  }

  private get activeFile(): EditorFile | undefined {
    return this._files[this.activeFileIndex];
  }

  private getDisplayContent(file: EditorFile): string {
    if (isRemoteContentString(file.content)) {
      return this.resolvedContent.get(this.activeFileIndex) ?? 'Loading...';
    }
    return file.content;
  }

  private get showSidebarHeader(): boolean {
    return this.getHeaderTitle() !== null || this.getHeaderRepoHref() !== undefined;
  }

  private getHeaderTitle(): string | null {
    const h = this.config.sidebarHeader;
    if (h?.title != null && h.title !== '') {
      return h.title;
    }
    const repo = this.config.repoUrl ?? h?.repoUrl;
    if (repo) {
      return this.parseRepoLabel(repo);
    }
    return null;
  }

  private getHeaderRepoHref(): string | undefined {
    return this.config.sidebarHeader?.repoUrl ?? this.config.repoUrl;
  }

  private parseRepoLabel(repoUrl: string): string | null {
    try {
      const u = new URL(repoUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  private selectFile(index: number): void {
    if (index === this.activeFileIndex) {
      return;
    }
    this.abortPendingContentFetch();
    if (this.getRemoteCacheMaxEntries() === 1) {
      this.resolvedContent.clear();
      this.resolvedLruOrder = [];
    }
    this.activeFileIndex = index;
  }

  private toggleDir(pathKey: string): void {
    const next = new Set(this.expandedDirs);
    if (next.has(pathKey)) {
      next.delete(pathKey);
    } else {
      next.add(pathKey);
    }
    this.expandedDirs = next;
  }

  private toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, this.theme);
    } catch {
      /* ignore */
    }
  }

  private toggleFullscreen(): void {
    this.fullscreen = !this.fullscreen;
  }

  private async copyContent(): Promise<void> {
    const file = this.activeFile;
    if (!file) {
      return;
    }
    const text = this.getDisplayContent(file);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  private async getResolvedContentForIndex(i: number): Promise<string> {
    const file = this._files[i];
    if (!file) {
      return '';
    }
    if (!isRemoteContentString(file.content)) {
      return file.content;
    }
    if (this.resolvedContent.has(i)) {
      this.touchRemoteCache(i);
      return this.resolvedContent.get(i) as string;
    }
    try {
      const res = await fetch(file.content);
      if (!res.ok) {
        return `// Error loading content: ${String(res.status)} ${res.statusText}`;
      }
      return await res.text();
    } catch (e) {
      return `// Error loading content: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private async downloadZip(): Promise<void> {
    if (this._files.length === 0) {
      return;
    }
    const zip = new JSZip();
    for (let i = 0; i < this._files.length; i++) {
      const f = this._files[i];
      const body = await this.getResolvedContentForIndex(i);
      zip.file(normalizePath(f.path), body);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'source-code.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private renderTreeNodes(nodes: TreeNode[], depth: number): TemplateResult {
    const filterOn = this.treeFilterActive();
    return html`${nodes.map((n) => {
      if (n.kind === 'dir') {
        const open = filterOn || this.expandedDirs.has(n.pathKey);
        return html`
          <div class="tree-dir">
            <div
              class="tree-row dir-row"
              style=${`padding-left:${6 + depth * 12}px`}
              title=${n.pathKey || n.name}
              @click=${() => this.toggleDir(n.pathKey)}
            >
              <span class="tree-chevron-slot">
                <svg
                  class="tree-chevron-svg ${open ? 'is-open' : ''}"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path fill="currentColor" d="M4 2 L9 6 L4 10 Z" />
                </svg>
              </span>
              <svg class="tree-row-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M1.75 3A1.25 1.25 0 0 0 .5 4.25v9.5C.5 14.44 1.06 15 1.75 15h12.5c.69 0 1.25-.56 1.25-1.25v-7c0-.69-.56-1.25-1.25-1.25H8.06L6.56 4.25A1.25 1.25 0 0 0 5.31 3.5H1.75Z"
                />
              </svg>
              <span class="tree-label">${n.name}</span>
            </div>
            ${open ? this.renderTreeNodes(n.children, depth + 1) : nothing}
          </div>
        `;
      }
      return html`
        <div
          class="tree-row file-row ${n.fileIndex === this.activeFileIndex ? 'is-active' : ''}"
          style=${`padding-left:${6 + depth * 12}px`}
          title=${n.path}
          data-testid=${`file-item-${n.fileIndex}`}
          @click=${() => this.selectFile(n.fileIndex)}
        >
          <span class="tree-chevron-slot" aria-hidden="true"></span>
          <svg class="tree-row-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M4 1.25A1.25 1.25 0 0 1 5.25 0h4.88c.33 0 .65.13.88.37l2.12 2.12c.24.23.37.55.37.88V14.75A1.25 1.25 0 0 1 12.25 16h-8A1.25 1.25 0 0 1 3 14.75v-13Zm1.25-.5a.5.5 0 0 0-.5.5V4h4.25a.5.5 0 0 0 .5-.5V.75H5.5ZM9 5H4.5v9.25a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V5.5a.5.5 0 0 0-.5-.5H9Z"
            />
          </svg>
          <span class="tree-label">${n.name}</span>
        </div>
      `;
    })}`;
  }

  private themeToggleLabel(): string {
    return this.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  private themeToggleIcon(): string {
    return this.theme === 'dark' ? '☀' : '☾';
  }

  render(): TemplateResult {
    if (this.repoLoading && this._files.length === 0 && this.config.repoUrl) {
      return html`<div class="container empty">Loading repository…</div>`;
    }
    if (this._repoError && this._files.length === 0) {
      return html`<div class="container empty">${this._repoError}</div>`;
    }
    if (this._files.length === 0) {
      return html`<div class="container empty">No files configured.</div>`;
    }

    const file = this.activeFile;
    if (!file) {
      return html``;
    }

    const showDesc =
      this.config.showFileDescription !== false && Boolean(file.description?.trim());

    const display = this.getDisplayContent(file);
    const lang = file.language || 'javascript';
    const wrap = this.isWordWrap();
    const view = prepareCodeView(display, lang, { perLine: wrap });

    const title = this.getHeaderTitle();
    const repoHref = this.getHeaderRepoHref();

    return html`
      <div class="container">
        <div class="sidebar">
          ${this.showSidebarHeader
            ? html`
                <div class="sidebar-header" data-testid="sidebar-header">
                  ${title
                    ? html`<span class="sidebar-header-title" title=${title}>${title}</span>`
                    : html`<span class="sidebar-header-title"></span>`}
                  ${repoHref
                    ? html`
                        <span class="sidebar-header-link">
                          <a
                            href=${repoHref}
                            title=${repoHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open repository on GitHub"
                            data-testid="sidebar-github-link"
                          >
                            <svg width="18" height="18" viewBox="0 0 98 96" aria-hidden="true">
                              <path
                                fill="currentColor"
                                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.245-22.23-5.42-22.23-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                              />
                            </svg>
                          </a>
                        </span>
                      `
                    : nothing}
                </div>
              `
            : nothing}
          <div class="tree-search-wrap">
            <input
              type="search"
              class="tree-search-input"
              placeholder="Go to file"
              spellcheck="false"
              autocomplete="off"
              aria-label="Filter files"
              data-testid="tree-filter-input"
              .value=${this.treeFilter}
              @input=${(e: Event) => {
                this.treeFilter = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <div class="tree-scroll">${this.renderTreeNodes(this.visibleTreeNodes(), 0)}</div>
        </div>
        <div class="main-area">
          <div class="toolbar">
            <div class="toolbar-left">
              <button
                type="button"
                class="icon-btn"
                aria-label=${this.themeToggleLabel()}
                @click=${this.toggleTheme}
              >
                ${this.themeToggleIcon()}
              </button>
            </div>
            <div class="toolbar-right">
              <button type="button" @click=${this.copyContent} data-testid="copy-btn">Copy</button>
              <button type="button" @click=${this.downloadZip} data-testid="download-btn">
                Download All
              </button>
              <button
                type="button"
                class="icon-btn"
                aria-label=${this.fullscreen ? 'Exit full screen' : 'Enter full screen'}
                @click=${this.toggleFullscreen}
              >
                ${this.fullscreen ? '⤓' : '⤢'}
              </button>
            </div>
          </div>
          ${wrap && view.highlightedLineHtml
            ? html`<div class="code-wrapper"><div class="code-grid" style=${`--line-gutter-digits:${String(view.highlightedLineHtml.length).length}`}>${view.highlightedLineHtml.map((lineHtml, i) => html`<span class="code-grid-lineno" aria-hidden="true">${i + 1}</span><div class="code-grid-line"><code class="language-${lang}">${unsafeHTML(lineHtml)}</code></div>`)}</div></div>`
            : html`<div class="code-wrapper"><pre class="line-numbers line-numbers--nowrap" aria-hidden="true">${view.lineNumbersText || '1'}</pre><pre class="code-area code-area--nowrap"><code class="language-${lang}">${unsafeHTML(view.highlightedHtml)}</code></pre></div>`}
          ${showDesc
            ? html`
                <div class="description-panel" data-testid="description-panel">${file.description}</div>
              `
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'embeda-code': EmbedaCode;
  }
}
