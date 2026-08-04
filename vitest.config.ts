import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      STORAGE_DRIVER: 'memory',
    },
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
