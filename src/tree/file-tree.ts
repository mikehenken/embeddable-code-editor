import type { EditorConfig, EditorFile } from '../types';

export type TreeNode = TreeDir | TreeFile;

export interface TreeDir {
  kind: 'dir';
  name: string;

  /** Stable key for expand/collapse, e.g. "src/components" */
  pathKey: string;
  children: TreeNode[];
}

export interface TreeFile {
  kind: 'file';
  name: string;
  path: string;
  fileIndex: number;
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function mergeFileLists(repoFiles: EditorFile[], overrides: EditorFile[]): EditorFile[] {
  const map = new Map<string, EditorFile>();
  for (const f of repoFiles) {
    map.set(normalizePath(f.path), { ...f });
  }
  for (const o of overrides) {
    map.set(normalizePath(o.path), { ...o });
  }
  return [...map.values()].sort((a, b) =>
    a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }),
  );
}

function sortTreeNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'dir' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  for (const n of nodes) {
    if (n.kind === 'dir') {
      sortTreeNodes(n.children);
    }
  }
}

/**
 * Builds the directory tree from flat file paths (forward-slash normalized).
 */
export function buildFileTree(files: EditorFile[]): TreeNode[] {
  const root: TreeDir = { kind: 'dir', name: '', pathKey: '', children: [] };

  files.forEach((file, fileIndex) => {
    const norm = normalizePath(file.path);
    const parts = norm.split('/').filter(Boolean);
    if (parts.length === 0) {
      return;
    }
    const leafName = parts.pop() as string;
    let cursor = root;
    let pathAccum = '';
    for (const part of parts) {
      pathAccum = pathAccum ? `${pathAccum}/${part}` : part;
      let dir = cursor.children.find(
        (c): c is TreeDir => c.kind === 'dir' && c.name === part,
      );
      if (!dir) {
        dir = { kind: 'dir', name: part, pathKey: pathAccum, children: [] };
        cursor.children.push(dir);
      }
      cursor = dir;
    }
    cursor.children.push({
      kind: 'file',
      name: leafName,
      path: norm,
      fileIndex,
    });
  });

  sortTreeNodes(root.children);
  return root.children;
}

/** Every folder starts collapsed so the sidebar only mounts rows for the visible level. */
export function initialExpandedDirKeys(): Set<string> {
  return new Set();
}

/** `pathKey` segments for each parent directory of a file (e.g. `src/a/b.ts` → `['src','src/a']`). */
export function parentDirKeysForFilePath(normPath: string): string[] {
  const parts = normalizePath(normPath).split('/').filter(Boolean);
  if (parts.length <= 1) {
    return [];
  }
  const keys: string[] = [];
  let acc = '';
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    if (seg === undefined) {
      break;
    }
    acc = acc ? `${acc}/${seg}` : seg;
    keys.push(acc);
  }
  return keys;
}

/** Prefer root `README.md`, else the first `…/readme.md` under a folder. Returns `-1` if none. Case-insensitive. */
export function findReadmeFileIndex(files: EditorFile[]): number {
  let rootIdx = -1;
  let nestedIdx = -1;
  for (let i = 0; i < files.length; i++) {
    const p = normalizePath(files[i].path).toLowerCase();
    if (p === 'readme.md') {
      rootIdx = i;
    } else if (p.endsWith('/readme.md') && nestedIdx < 0) {
      nestedIdx = i;
    }
  }
  if (rootIdx >= 0) {
    return rootIdx;
  }
  return nestedIdx;
}

/** First-open selection: explicit `defaultFile`, else repo README heuristic, else `0`. */
export function resolveInitialFileIndex(files: EditorFile[], config: EditorConfig): number {
  if (files.length === 0) {
    return 0;
  }
  const raw = config.defaultFile?.trim();
  if (raw) {
    const target = normalizePath(raw);
    const i = files.findIndex((f) => normalizePath(f.path) === target);
    if (i >= 0) {
      return i;
    }
  }
  if (config.repoUrl) {
    const ri = findReadmeFileIndex(files);
    if (ri >= 0) {
      return ri;
    }
  }
  return 0;
}

/** Tree filtered by substring match on file path/name or directory name; keeps ancestor dirs of matches. */
export function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return nodes;
  }
  const out: TreeNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'file') {
      if (n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)) {
        out.push(n);
      }
    } else {
      const kids = filterTreeNodes(n.children, q);
      if (kids.length > 0) {
        out.push({ kind: 'dir', name: n.name, pathKey: n.pathKey, children: kids });
      } else if (n.name.toLowerCase().includes(q)) {
        out.push({ kind: 'dir', name: n.name, pathKey: n.pathKey, children: n.children });
      }
    }
  }
  return out;
}

export function isRemoteContentString(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
