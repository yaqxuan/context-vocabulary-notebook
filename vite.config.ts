import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3107'
    }
  },
  build: {
    outDir: 'dist/client'
  },
  test: {
    environment: 'jsdom',
    css: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['dist/**', 'node_modules/**']
  }
});
