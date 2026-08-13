// eslint-disable-next-line import/no-unresolved
import { defineConfig } from 'vite';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { sinonChaiCjsPlugin } from './scripts/vite/sinonChaiCjsPlugin.mts';

/**
 * Minimal Vite config used by cypress-vite to bundle the Cypress spec/support files.
 * Kept separate from the app config on purpose: the specs need no React plugin and no
 * dev-server plugins - only the tsconfig path aliases (src/*, test/*, ...), which Vite
 * resolves natively per importing file (specs are governed by test/tsconfig.json).
 */
export default defineConfig({
  plugins: [sinonChaiCjsPlugin()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    target: 'es2020',
  },
});
