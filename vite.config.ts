import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'EmbedaCode',
      formats: ['es', 'umd'],
      fileName: (format) => `embedacode.${format}.js`
    },
    rollupOptions: {
      external: ['lit', 'lit/decorators.js', 'lit/directives/class-map.js', 'prismjs'],
      output: {
        globals: {
          lit: 'lit',
          'lit/decorators.js': 'litDecorators',
          'lit/directives/class-map.js': 'litClassMap',
          prismjs: 'Prism'
        }
      }
    }
  }
});
