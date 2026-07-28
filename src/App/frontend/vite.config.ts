import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// This file is loaded by Vite itself, before any tsconfig path aliases are in play, so the
// plugin imports must be relative.
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { codegenWatchPlugin } from './scripts/vite/codegenWatchPlugin';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { devEntryPlugin } from './scripts/vite/devEntryPlugin';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { devServerHeadersPlugin } from './scripts/vite/devServerHeadersPlugin';

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const isDevBuild = mode === 'development';

  return {
    clearScreen: false,
    define: {
      // The bundle is loaded directly by browsers (no downstream bundler), so this must be
      // statically replaced. Vite does not do it automatically in library mode.
      'process.env.NODE_ENV': JSON.stringify(isDevBuild ? 'development' : 'production'),
    },
    plugins: [
      // JSX and Fast Refresh
      react(),
      // React Compiler (automatic memoization). plugin-react 6 no longer runs babel itself,
      // so the compiler is applied through a separate babel plugin with a preconfigured
      // filter that only transforms React-looking files.
      babel({ presets: [reactCompilerPreset()] }),
      // Adds `Access-Control-Allow-Origin: *` (the app page loads our assets cross-origin)
      // and `X-Altinn-Frontend-Branch` (LocalTest detects the dev server by it) to every
      // dev-server response.
      devServerHeadersPlugin(),
      // Serves /altinn-app-frontend.js as a loader script that dynamically imports the real
      // app code, plus an empty /altinn-app-frontend.css so the backend HTML doesn't 404.
      // The /schemas URLs need no plugin: the dev server serves project-root files statically,
      // and `yarn copy-schemas` puts them next to the bundle in production builds.
      devEntryPlugin(),
      // Runs codegen at startup, then re-runs it when component config files change.
      codegenWatchPlugin(),
    ],
    resolve: {
      // Resolves import aliases from tsconfig.json `paths` (src/*, test/*, schemas/*, ...),
      // including the @app/* packages' self-references through their own tsconfig files.
      tsconfigPaths: true,
      // See the shim for why bare `leaflet-draw` imports cannot be bundled directly.
      // The regex only matches the bare specifier - subpath imports (e.g. the CSS) are untouched.
      alias: [
        { find: /^leaflet-draw$/, replacement: path.resolve(import.meta.dirname, 'scripts/vite/leafletDrawShim.ts') },
      ],
      // The @app/* workspace packages are consumed as symlinked raw TypeScript; make sure
      // their react/react-dom imports always resolve to this app's single copy (two React
      // instances break hooks).
      dedupe: ['react', 'react-dom'],
    },
    css: {
      modules: {
        // Same as the old css-loader `exportLocalsConvention: 'camel-case'`: class names are
        // available both as written and camelized on the default export.
        localsConvention: 'camelCase',
      },
      devSourcemap: true,
    },
    // The schemas are handled explicitly instead (serveSchemasPlugin in dev, copy-schemas in build)
    publicDir: false,
    optimizeDeps: {
      // There is no index.html to scan for entry points (the HTML is backend-generated)
      entries: ['src/index.tsx'],
    },
    build: {
      outDir: 'dist',
      target: 'es2020',
      sourcemap: isDevBuild ? ('inline' as const) : false,
      minify: !isDevBuild,
      // Library mode is what gives us the required output: a single self-executing (IIFE)
      // classic script + a single CSS file, with fixed file names and all assets inlined.
      // The backend-generated HTML loads it with a plain <script> tag (not type="module"),
      // often from a different origin, so the output cannot be an ES module.
      lib: {
        entry: path.resolve(import.meta.dirname, 'src/index.tsx'),
        formats: ['iife' as const],
        name: 'altinnAppFrontend',
        fileName: () => 'altinn-app-frontend.js',
        cssFileName: 'altinn-app-frontend',
      },
    },
    server: {
      // LocalTest, studioctl and CI all expect the dev server on port 8080
      port: 8080,
      strictPort: true,
      // The app page is served by the app backend (through LocalTest), not by this dev server,
      // and it contains a <base href> pointing at the backend. Asset URLs (e.g. the leaflet
      // icons referenced from CSS and JS) must therefore be absolute, or the browser would
      // resolve them against the backend origin and 404. Production builds are unaffected
      // (assets are inlined there).
      origin: 'http://localhost:8080',
      // devServerHeadersPlugin sets Access-Control-Allow-Origin itself — avoid duplicate headers
      cors: false,
      // Requests arrive proxied through LocalTest at app-frontend.local.altinn.cloud:8000
      allowedHosts: ['.local.altinn.cloud', 'localhost', '127.0.0.1'],
      // The HMR websocket connects directly to the dev server, bypassing the LocalTest proxy
      // (same behavior as the old webpack `client.webSocketURL.hostname` setting)
      hmr: {
        host: 'localhost',
        port: 8080,
      },
    },
  };
});
