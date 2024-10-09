import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'EmbeddableCodeEditor',
      formats: ['umd'],
      fileName: () => `embeddable-code-editor.standalone.js`
    }
  }
});
