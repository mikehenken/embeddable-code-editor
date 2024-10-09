import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'EmbeddableCodeEditor',
      formats: ['iife'],
      fileName: () => `embeddable-code-editor.standalone.js`
    }
  }
});
