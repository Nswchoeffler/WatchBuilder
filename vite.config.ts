/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the app from /WatchBuilder/; the Pages workflow sets PAGES_BASE. Local dev stays at /.
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
  server: {
    // Visual Studio keeps its index files in .vs locked, and watching a locked file crashes the dev server (EBUSY).
    watch: { ignored: ['**/.vs/**'] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
