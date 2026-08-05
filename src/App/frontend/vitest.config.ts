import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Vitest only defaults NODE_ENV when it is unset. The repository tooling can invoke tests with
// NODE_ENV=production, which makes React Testing Library load React's production build without act().
process.env.NODE_ENV = 'test';

const repoNodeModules = path.resolve(import.meta.dirname, '../../..', 'node_modules');

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^react$/, replacement: path.join(repoNodeModules, 'react') },
      { find: /^react-dom$/, replacement: path.join(repoNodeModules, 'react-dom') },
      { find: /^react\/jsx-runtime$/, replacement: path.join(repoNodeModules, 'react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.join(repoNodeModules, 'react/jsx-dev-runtime.js') },
    ],
  },
  test: {
    clearMocks: true,
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: ['html-react-parser'],
        },
      },
    },
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://local.altinn.cloud/ttd/test',
      },
    },
    exclude: ['test/e2e/**', 'node_modules/**', 'dist/**'],
    globals: true,
    globalSetup: './src/globalSetup.ts',
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: process.env.CI ? { junit: 'junit.xml' } : undefined,
    execArgv: ['--no-experimental-webstorage'],
    pool: 'vmThreads',
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: Number.parseInt(process.env.VITEST_TIMEOUT ?? '20000', 10),
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
    },
  },
});
