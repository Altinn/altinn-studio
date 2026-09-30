import path from 'node:path';
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';

const contractSchemas = path.resolve(import.meta.dirname, '../../../../common/ts/layout-contract/schemas');

export function schemaPlugin(schemaRoot = contractSchemas): Plugin {
  const resolvedRoot = path.resolve(schemaRoot);
  return {
    name: 'altinn:contract-schemas',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [pathname, query] = (req.url ?? '/').split('?');
        if (!pathname.startsWith('/schemas/')) {
          next();
          return;
        }
        let schemaPath: string;
        try {
          schemaPath = path.resolve(resolvedRoot, `.${decodeURIComponent(pathname.slice('/schemas'.length))}`);
        } catch {
          res.statusCode = 400;
          res.end('Invalid schema path');
          return;
        }

        if (!schemaPath.startsWith(`${resolvedRoot}${path.sep}`)) {
          res.statusCode = 403;
          res.end('Invalid schema path');
          return;
        }

        // Vite serves the canonical file, including its usual MIME handling and file access checks.
        const querySuffix = query ? `?${query}` : '';
        req.url = `/@fs/${normalizePath(schemaPath)}${querySuffix}`;
        next();
      });
    },
  };
}
