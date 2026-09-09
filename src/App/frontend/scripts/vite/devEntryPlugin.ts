import type { Plugin } from 'vite';

/**
 * The app backend generates HTML with a classic (non-module) script tag:
 *   <script src="https://<host>/altinn-app-frontend.js" crossorigin></script>
 *
 * In production that URL serves the bundled app, but the Vite dev server serves unbundled ES
 * modules and has no such file. This loader script bridges the two: it is served at
 * /altinn-app-frontend.js and dynamically imports the react-refresh preamble (Fast Refresh,
 * via the entry @vitejs/plugin-react provides for pages without Vite-controlled HTML),
 * the Vite dev client (HMR) and finally the actual app entry point.
 *
 * All imports use absolute URLs derived from the script's own `src`, because
 * `src/features/baseurlinjection.ts` installs a `<base href>` pointing at the app backend,
 * which would otherwise redirect relative imports away from the dev server.
 */
const devEntryLoader = `(function () {
  var origin = new URL(document.currentScript.src).origin;
  import(origin + '/@id/@vitejs/plugin-react/preamble')
    .then(function () {
      return import(origin + '/@vite/client');
    })
    .then(function () {
      return import(origin + '/src/index.tsx');
    })
    .catch(function (err) {
      console.error('[altinn-app-frontend] Failed to load the app from the Vite dev server', err);
    });
})();`;

export function devEntryPlugin(): Plugin {
  return {
    name: 'altinn:dev-entry',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === '/altinn-app-frontend.js') {
          res.setHeader('Content-Type', 'text/javascript');
          res.setHeader('Cache-Control', 'no-store');
          res.end(devEntryLoader);
        } else if (url === '/altinn-app-frontend.css') {
          // The backend-generated HTML always links this stylesheet. In dev mode all CSS is
          // injected as <style> tags by the Vite dev client, so serve an empty file to avoid a 404.
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-store');
          res.end('/* Dev mode: styles are injected by the Vite dev server */\n');
        } else {
          next();
        }
      });
    },
  };
}
