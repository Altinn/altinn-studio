import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';

const contractSchemas = path.resolve(import.meta.dirname, '../../../../common/ts/layout-contract/schemas');

export function schemaPlugin(): Plugin {
  return {
    name: 'altinn:contract-schemas',
    async generateBundle() {
      const entries = await fs.readdir(contractSchemas, { recursive: true, withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) {
          continue;
        }
        const file = path.join(entry.parentPath, entry.name);
        this.addWatchFile(file);
        this.emitFile({
          type: 'asset',
          fileName: `schemas/${normalizePath(path.relative(contractSchemas, file))}`,
          source: await fs.readFile(file),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [pathname, query] = (req.url ?? '/').split('?');
        if (!pathname.startsWith('/schemas/')) {
          next();
          return;
        }
        let schemaPath: string;
        try {
          schemaPath = path.resolve(contractSchemas, `.${decodeURIComponent(pathname.slice('/schemas'.length))}`);
        } catch {
          res.statusCode = 400;
          res.end('Invalid schema path');
          return;
        }

        if (!schemaPath.startsWith(`${contractSchemas}${path.sep}`)) {
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
