import type { EditorFile } from '../types';

/** Hard cap on blob entries from the GitHub tree API (avoids huge arrays and sidebar DOM blowups). */
export const MAX_REPO_FILES_FROM_API = 2500;

export async function fetchGitHubRepo(
  repoUrl: string,
  branchOrTag: string = 'main',
): Promise<EditorFile[]> {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('Invalid GitHub repository URL');
    }

    const owner = parts[0];
    const repo = parts[1];

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branchOrTag}?recursive=1`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error(
          'GitHub API rate limit exceeded. Consider using a server-side proxy or build-time generation.',
        );
      }
      throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
    }

    const data: unknown = await response.json();

    if (!data || typeof data !== 'object' || !('tree' in data)) {
      throw new Error('Invalid response from GitHub API');
    }

    const rawTree = (data as { tree: unknown }).tree;
    if (!Array.isArray(rawTree)) {
      throw new Error('Invalid response from GitHub API');
    }

    interface GitTreeNode {
      type: string;
      path: string;
    }

    const blobs = rawTree.filter(
      (node: unknown): node is GitTreeNode =>
        node !== null &&
        typeof node === 'object' &&
        'type' in node &&
        'path' in node &&
        (node as GitTreeNode).type === 'blob' &&
        typeof (node as GitTreeNode).path === 'string',
    );

    blobs.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));

    const capped = blobs.slice(0, MAX_REPO_FILES_FROM_API);

    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
    };

    return capped.map((node) => {
      const path = node.path;
      const ext = path.split('.').pop()?.toLowerCase() || '';
      return {
        path,
        content: `https://raw.githubusercontent.com/${owner}/${repo}/${branchOrTag}/${path}`,
        language: languageMap[ext] || 'javascript',
      };
    });
  } catch (error) {
    console.error('Error fetching GitHub repository:', error);
    throw error;
  }
}
