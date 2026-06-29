import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // One vitest run across every lib; each sub-package's own config (env, setup, include) applies.
    projects: ['./*/vitest.config.ts'],
  },
});
