import type { Plugin } from 'vite';

// The CommonJS branch of sinon-chai's UMD wrapper (sinon-chai 3.x, lib/sinon-chai.js).
const CJS_GUARD = 'typeof require === "function"';

/**
 * sinon-chai 3.x is a UMD module that only assigns `module.exports` when it thinks it runs under
 * CommonJS, which it detects with `typeof require === 'function'`. Webpack made that true inside
 * every bundled module; Rolldown renames its internal require, so in a browser bundle the check
 * fails, the module falls through to its `chai.use(...)` global branch and exports nothing.
 * `cypress-fail-on-console-error` does `import sinonChai from 'sinon-chai'` and passes the result
 * to `chai.use()`, so without this the Cypress support file throws "fn is not a function" while
 * loading - failing every spec before a single test runs.
 *
 * Forcing the CommonJS branch restores the export and matches what the webpack build did.
 */
export function sinonChaiCjsPlugin(): Plugin {
  return {
    name: 'altinn:sinon-chai-cjs',
    transform(code, id) {
      if (!/sinon-chai[\\/]lib[\\/]sinon-chai\.js$/.test(id) || !code.includes(CJS_GUARD)) {
        return null;
      }
      // Padded to the same length so the existing source map stays aligned.
      return { code: code.replace(CJS_GUARD, 'true'.padEnd(CJS_GUARD.length)), map: null };
    },
  };
}
