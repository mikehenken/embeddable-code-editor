export interface EditorFile {
  path: string;
  content: string;
  language?: string;
  description?: string;
}

/** Optional header above the file tree (title and/or GitHub link). */
export interface SidebarHeaderConfig {
  /** Shown as the main label; if omitted and `repoUrl` is set, defaults to `owner/repo`. */
  title?: string;
  /** If set, shows a small GitHub icon that opens this URL in a new tab. */
  repoUrl?: string;
}

export interface EditorConfig {
  files?: EditorFile[];
  repoUrl?: string;
  branch?: string;
  tag?: string;
  /**
   * When false, the description panel is never shown (even when files define `description`).
   * Default: true.
   */
  showFileDescription?: boolean;
  /** Optional block above the tree (use with or without `repoUrl`). */
  sidebarHeader?: SidebarHeaderConfig;
  /**
   * How many remote (URL-backed) file bodies to keep in memory after load.
   * Default `1`: when you open another file, the previous body is dropped and will be fetched again if you return.
   * Set higher (e.g. `8`) for a small LRU cache so back-navigation avoids refetch.
   */
  remoteCacheMaxEntries?: number;
  /**
   * Wrap long lines in the code view (`pre-wrap`).
   * Default: true. Set to `false` for horizontal scrolling only.
   */
  wordWrap?: boolean;
  /**
   * Path of the file to open first (normalized like `README.md` or `src/index.ts`).
   * If missing and `repoUrl` is set, the first `README.md` (root, then nested) is selected when present.
   */
  defaultFile?: string;
}
