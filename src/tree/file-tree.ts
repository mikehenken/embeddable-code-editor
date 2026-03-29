import type { EditorFile } from '../types';

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

export function isRemoteContentString(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
