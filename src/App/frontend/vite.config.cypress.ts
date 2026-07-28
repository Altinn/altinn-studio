import { defineConfig } from 'vite';

/**
 * Minimal Vite config used by cypress-vite to bundle the Cypress spec/support files.
 * Kept separate from the app config on purpose: the specs need no React plugin, no dev-server
 * plugins and no library-mode output - only the tsconfig path aliases (src/*, test/*, ...),
 * which Vite resolves natively per importing file (specs are governed by test/tsconfig.json).
 */
// eslint-disable-next-line import/no-default-export
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    target: 'es2020',
    sourcemap: 'inline',
    minify: false,
  },
  logLevel: 'warn',
});
