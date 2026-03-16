# Embeddable Code Editor

Read-only syntax highlighter with a file tree. Lit + Prism; use it from a script tag or from npm.

## Install

From GitHub Packages (npm alternative):

```bash
npm install @mikehenken/embeddable-code-editor
```

Add to your project's `.npmrc`:
```
@mikehenken:registry=https://npm.pkg.github.com
```

## Config

You pass a single object to the component: `editor.config = { files: [...] }`. Each file has:

| Field | Required | Description |
|-------|----------|-------------|
| `path` | yes | Label shown in the tree (e.g. `src/index.ts`) |
| `content` | yes | The code string |
| `language` | no | Prism language (`javascript`, `typescript`, `json`, `markdown`, etc.) |
| `description` | no | Shown in a panel under the code when this file is selected |

Example with two files and a description on one:

```javascript
editor.config = {
  files: [
    { path: 'src/index.ts', content: 'export const x = 1;', language: 'typescript' },
    {
      path: 'README.md',
      content: '# Hello',
      language: 'markdown',
      description: 'Project readme — edit at your own risk.'
    }
  ]
};
```

If a file has no `description`, the description panel stays hidden. Copy and download buttons apply to the currently selected file (copy to clipboard; download as a file).

---

## Script tag (no bundler)

Drop the standalone bundle in the page. It ships Lit and Prism, so one script is enough.

1. Load the script (from your own host or a CDN).
2. Put `<embeddable-code-editor>` where you want the block.
3. After the DOM is ready, set `element.config` to your `{ files }`.

```html
<script src="./dist/embeddable-code-editor.standalone.js"></script>
<embeddable-code-editor id="my-editor"></embeddable-code-editor>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('my-editor');
    editor.config = {
      files: [
        { path: 'src/index.ts', content: 'console.log("hi");', language: 'typescript' },
        { path: 'package.json', content: '{"name":"my-app"}', language: 'json' }
      ]
    };
  });
</script>
```

There’s a full example in the repo: **script-tag-example.html**. It uses the same pattern with several files and languages.

From GitHub Release (v1.0.0):

```html
<script src="https://github.com/mikehenken/embeddable-code-editor/releases/download/v1.0.0/embeddable-code-editor.standalone.js"></script>
```

For bundler users, install from GitHub Packages (see Install above). For script-tag, use the GitHub Release URL.

---

## npm (bundler or Node)

Install the package, then import the entry so the custom element is registered. After that you can use `<embeddable-code-editor>` in your HTML or framework.

```javascript
import 'embeddable-code-editor';
```

No default export — the import side-effect registers the tag. In a typical app you’d do that once (e.g. in your root or main bundle), then drop the element in a template:

```html
<embeddable-code-editor id="my-editor"></embeddable-code-editor>
```

```javascript
const editor = document.getElementById('my-editor');
editor.config = {
  files: [
    { path: 'src/foo.ts', content: 'const x = 1;', language: 'typescript' },
    { path: 'src/bar.ts', content: 'export {};', language: 'typescript', description: 'Bar module.' }
  ]
};
```

With a framework (e.g. React, Vue), use the element like any other custom element and set `config` when the ref is mounted. The component doesn’t depend on any framework.

---

## What you get

- **File tree** — Sidebar lists all entries in `config.files`; click to switch the main code view.
- **Syntax highlighting** — Prism handles the usual suspects (JS/TS, JSON, markdown, etc.).
- **Copy** — Copies the current file’s content to the clipboard.
- **Download** — Triggers a download of the current file (filename from `path`).
- **Description panel** — Renders under the code when the selected file has a `description`; hidden otherwise.
- **Themes** — Light/dark via CSS variables if you want to restyle.
