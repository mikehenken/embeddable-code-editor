import { describe, it, expect } from 'vitest';
import {
  buildFileTree,
  filterTreeNodes,
  findReadmeFileIndex,
  initialExpandedDirKeys,
  parentDirKeysForFilePath,
  resolveInitialFileIndex,
} from './file-tree';
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

  it('parentDirKeysForFilePath returns ancestor directory keys', () => {
    expect(parentDirKeysForFilePath('README.md')).toEqual([]);
    expect(parentDirKeysForFilePath('src/index.ts')).toEqual(['src']);
    expect(parentDirKeysForFilePath('src/a/b/c.ts')).toEqual(['src', 'src/a', 'src/a/b']);
  });

  it('findReadmeFileIndex prefers root README over nested', () => {
    const files: EditorFile[] = [
      { path: 'docs/README.md', content: 'n' },
      { path: 'README.md', content: 'r' },
    ];
    expect(findReadmeFileIndex(files)).toBe(1);
  });

  it('resolveInitialFileIndex uses defaultFile then repo README', () => {
    const files: EditorFile[] = [
      { path: '0.txt', content: '' },
      { path: 'README.md', content: '' },
    ];
    expect(
      resolveInitialFileIndex(files, { repoUrl: 'https://github.com/a/b', defaultFile: '0.txt' }),
    ).toBe(0);
    expect(resolveInitialFileIndex(files, { repoUrl: 'https://github.com/a/b' })).toBe(1);
    expect(resolveInitialFileIndex(files, {})).toBe(0);
  });

  it('filterTreeNodes keeps paths to matching files', () => {
    const files: EditorFile[] = [
      { path: 'src/index.ts', content: '' },
      { path: 'lib/util.ts', content: '' },
    ];
    const tree = buildFileTree(files);
    const filtered = filterTreeNodes(tree, 'index');
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.kind).toBe('dir');
    if (filtered[0]?.kind === 'dir') {
      expect(filtered[0].children.some((c) => c.kind === 'file' && c.name === 'index.ts')).toBe(true);
    }
  });
});
