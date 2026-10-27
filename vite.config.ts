/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
