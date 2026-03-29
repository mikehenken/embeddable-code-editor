# Embeddable Code Editor

Lit web component: read-only code view, Prism highlighting, sidebar tree. Ship it with a single script tag or pull it from npm (GitHub Packages).

## Repo layout

| Path | Role |
|------|------|
| `src/editor/` | `<embeddable-code-editor>` and its styles |
| `src/highlight/` | Prism wiring, size guards, `prepareCodeView` |
| `src/tree/` | Path → folder tree, merge/override lists |
| `src/github/` | Repo listing from the GitHub API |
| `src/types.ts` | Config / file types shared by the above |
| `examples/` | HTML demos (build first, then serve repo root) |
| `e2e/` | Playwright; HTML fixtures under `e2e/fixtures/` |

## Install (GitHub Packages)

```bash
npm install @mikehenken/embeddable-code-editor
```

`.npmrc`:

```
@mikehenken:registry=https://npm.pkg.github.com
```

## Script tag

Build produces `dist/embeddable-code-editor.standalone.js` (Lit + Prism bundled).

```html
<script src="./dist/embeddable-code-editor.standalone.js"></script>
<embeddable-code-editor id="editor"></embeddable-code-editor>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('editor').config = {
      files: [
        { path: 'src/index.ts', content: 'console.log("hi");', language: 'typescript' },
      ],
    };
  });
</script>
```

Heavier example: [examples/script-tag-example.html](https://github.com/mikehenken/embeddable-code-editor/blob/main/examples/script-tag-example.html).

Pinned release asset (no npm):

```html
<script src="https://github.com/mikehenken/embeddable-code-editor/releases/download/v1.1.0/embeddable-code-editor.standalone.js"></script>
```

## npm / bundler

```javascript
import '@mikehenken/embeddable-code-editor';
```

Import registers the custom element; no default export. Set `element.config` after the node exists.

## Config

**File object**

| Field | Required | Notes |
|-------|----------|--------|
| `path` | yes | Tree label, e.g. `src/app.ts` |
| `content` | yes | String or URL (fetched when the file is selected) |
| `language` | no | Prism id: `typescript`, `json`, `markdown`, … |
| `description` | no | Shown under the code when this file is active |

**Top-level `config`**

| Field | Notes |
|-------|--------|
| `files` | File objects; paths with `/` build nested folders |
| `repoUrl` | GitHub HTTPS URL; merges with `files` (same path = your `files` entry wins) |
| `branch` | Branch for `repoUrl` (default `main`) |
| `tag` | Tag for `repoUrl`; overrides `branch` when set |
| `showFileDescription` | `false` hides the description strip entirely |
| `sidebarHeader` | Optional `{ title?, repoUrl? }` above the tree |
| `remoteCacheMaxEntries` | How many URL-fetched bodies to keep (default `1`; raise for a small LRU) |

## GitHub repos

```javascript
editor.config = {
  repoUrl: 'https://github.com/owner/repo',
  branch: 'develop', // optional
};
```

Tree API is capped at **2500** entries client-side. Folders start **collapsed** so big repos stay usable.

Unauthenticated API calls count against GitHub’s **60/hour** limit; heavy sites should proxy with a token. Raw file fetches and the tree API are fine from the browser (CORS).

## Remote `content` URLs

```javascript
editor.config = {
  files: [
    {
      path: 'package.json',
      content: 'https://raw.githubusercontent.com/microsoft/TypeScript/main/package.json',
      language: 'json',
    },
  ],
};
```

Needs CORS-friendly URLs. Default cache keeps one remote body; bump `remoteCacheMaxEntries` if you want back/forward without refetch.

## Toolbar behavior

- **Copy** — current file text to clipboard  
- **Download all** — zip of every file in the tree  
- **Theme** — light/dark; stored as `embeddable-code-editor-theme` in `localStorage` (first paint follows `prefers-color-scheme`, else dark)  
- **Fullscreen** — Escape exits  

CSS variables on `:host` still override colors if you need a custom skin.
