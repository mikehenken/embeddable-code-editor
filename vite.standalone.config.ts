import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'EmbedaCode',
      formats: ['umd'],
      fileName: () => `embedacode.standalone.js`
    }
  }
});
