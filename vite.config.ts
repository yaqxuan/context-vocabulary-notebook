import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const clientPort = Number(process.env.CLIENT_PORT ?? 5173);
const apiPort = Number(process.env.PORT ?? 3107);

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: clientPort,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/uploads': `http://localhost:${apiPort}`,
    }
  },
  build: {
    outDir: 'dist/client'
  },
  test: {
    environment: 'jsdom',
    css: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/dist/**', '**/node_modules/**', '.claude/**', 'artifacts/**', 'tests/e2e/**']
  }
});
