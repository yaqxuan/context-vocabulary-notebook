import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/mobile',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../../dist/mobile',
    emptyOutDir: true,
  },
});
