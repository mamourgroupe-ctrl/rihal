import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@rihal-v2/database': fileURLToPath(new URL('./packages/database/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
    globalSetup: ['./tests/postgres.setup.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 60_000,
  },
});
