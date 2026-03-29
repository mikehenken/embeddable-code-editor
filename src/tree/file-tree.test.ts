import { describe, it, expect } from 'vitest';
import { buildFileTree, initialExpandedDirKeys } from './file-tree';
import type { EditorFile } from '../types';

describe('file-tree', () => {
  it('initialExpandedDirKeys always returns an empty set (all folders collapsed)', () => {
    const files: EditorFile[] = [
      { path: 'a/b/f.ts', content: 'x' },
      { path: 'c/d/e.ts', content: 'y' },
    ];
    const tree = buildFileTree(files);
    expect(initialExpandedDirKeys().size).toBe(0);
    expect(initialExpandedDirKeys().size).toBe(0);
    expect(tree.length).toBeGreaterThan(0);
  });
});
