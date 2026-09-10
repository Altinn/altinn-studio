import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

import { devEntryPlugin } from './scripts/vite/devEntryPlugin';

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const isDevBuild = mode === 'development';

  return {
    define: {
      // The bundle is loaded directly by browsers (no downstream bundler), so this must be
      // statically replaced. Vite does not do it automatically in library mode.
      'process.env.NODE_ENV': JSON.stringify(isDevBuild ? 'development' : 'production'),
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      // Serves /altinn-app-frontend.js as a loader script that dynamically imports the real
      // app code, plus an empty /altinn-app-frontend.css so the backend HTML doesn't 404.
      // The /schemas URLs need no plugin: the dev server serves project-root files statically,
      // and `yarn copy-schemas` puts them next to the bundle in production builds.
      devEntryPlugin(),
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
    },
    css: {
      modules: {
        // Many stylesheets use kebab-case class names (.page-list-item) that the components
        // read as camelCase (classes.pageListItem). This exposes both spellings; without it
        // those lookups silently become undefined (CSS modules are typed as Record<string, string>,
        // so TypeScript would not catch it).
        localsConvention: 'camelCase',
      },
      devSourcemap: true,
    },
    optimizeDeps: {
      // There is no index.html to scan for entry points (the HTML is backend-generated)
      entries: ['src/index.tsx'],
    },
    build: {
      outDir: 'dist',
      target: 'es2020',
      // `cssTarget` defaults to `target`, which would make the CSS minifier read "es2020" as a
      // browser baseline old enough to lack `:is()`, and downlevel it to the legacy
      // `:-webkit-any()`. That is not a safe rewrite. Webpack shipped this CSS
      // untransformed, so keep it that way. (not setting cssTarget gave screenshot diff in percy in List-Component)
      cssTarget: 'esnext',
      sourcemap: isDevBuild ? 'inline' : false,
      minify: !isDevBuild,
      // Library mode is what gives us the required output: a single self-executing (IIFE)
      // classic script + a single CSS file, with fixed file names and all assets inlined.
      // The backend-generated HTML loads it with a plain <script> tag (not type="module"),
      // often from a different origin, so the output cannot be an ES module.
      lib: {
        entry: path.resolve(import.meta.dirname, 'src/index.tsx'),
        formats: ['iife'],
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
      // The app page is served from another origin (*.local.altinn.cloud:8000), which Vite's
      // default CORS allow-list (localhost only) would reject. Scoped to the same hosts as
      // `allowedHosts`
      cors: {
        origin: [/^https?:\/\/([^./]+\.)*local\.altinn\.cloud(:\d+)?$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/],
      },
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
