import { fork } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ChildProcess } from 'node:child_process';

describe('development schema serving', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-schema-serving-'));
  const frontendRoot = path.join(directory, 'frontend');
  const schemaRoot = path.join(directory, 'contract/schemas');
  let serverProcess: ChildProcess;
  let port: number;

  function writeJson(root: string, file: string, value: object) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(value));
  }

  beforeAll(async () => {
    writeJson(schemaRoot, 'json/layout/layout.schema.v1.json', { source: 'contract' });
    writeJson(frontendRoot, 'schemas/json/layout/layout.schema.v1.json', { source: 'legacy' });
    writeJson(frontendRoot, 'schemas/json/layout/local-only.schema.v1.json', { source: 'legacy' });
    // Rolldown's native bindings cannot receive RegExp values from Vitest's VM realm.
    // Start Vite in a real Node process, while keeping the suite's VM worker configuration.
    const require = createRequire(import.meta.url);
    const pluginUrl = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/vite/schemaPlugin.ts')).href;
    const serverScript = path.join(directory, 'server.mjs');
    fs.writeFileSync(
      serverScript,
      `import http from 'node:http';
      import { createServer } from ${JSON.stringify(pathToFileURL(require.resolve('vite')).href)};
      import { schemaPlugin } from ${JSON.stringify(pluginUrl)};
      const vite = await createServer({
        configFile: false,
        root: ${JSON.stringify(frontendRoot)},
        plugins: [schemaPlugin(${JSON.stringify(schemaRoot)})],
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, fs: { allow: [${JSON.stringify(directory)}] } },
        optimizeDeps: { noDiscovery: true },
      });
      const server = http.createServer(vite.middlewares);
      server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
      process.on('message', async () => {
        await vite.close();
        server.close(() => process.exit(0));
      });`,
    );
    serverProcess = fork(serverScript, { execArgv: ['--import', require.resolve('tsx')], silent: true });
    let stderr = '';
    serverProcess.stderr?.on('data', (chunk) => (stderr += chunk));
    port = await new Promise<number>((resolve, reject) => {
      serverProcess.once('message', (message: { port: number }) => resolve(message.port));
      serverProcess.once('error', reject);
      serverProcess.once('exit', (code) => reject(new Error(`Schema server exited with ${code}: ${stderr}`)));
    });
  });

  afterAll(async () => {
    if (serverProcess && serverProcess.exitCode === null && serverProcess.signalCode === null) {
      await new Promise<void>((resolve) => {
        serverProcess.once('exit', () => resolve());
        serverProcess.send('close');
      });
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function requestSchema(requestPath: string): Promise<{ status: number | undefined; body: string }> {
    return new Promise((resolve, reject) => {
      http
        .get({ hostname: '127.0.0.1', port, path: requestPath }, (response) => {
          let body = '';
          response.setEncoding('utf-8');
          response.on('data', (chunk) => (body += chunk));
          response.on('end', () => resolve({ status: response.statusCode, body }));
          response.on('error', reject);
        })
        .on('error', reject);
    });
  }

  it('serves the contract even when a conflicting frontend-local file exists', async () => {
    const response = await requestSchema('/schemas/json/layout/layout.schema.v1.json');
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ source: 'contract' });
  });

  it('serves newly added nested schemas without a file registry', async () => {
    writeJson(schemaRoot, 'json/future/nested/new.schema.v1.json', { type: 'boolean' });
    const response = await requestSchema('/schemas/json/future/nested/new.schema.v1.json?version=next');
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ type: 'boolean' });
  });

  it('does not fall back to frontend-local schemas', async () => {
    const response = await requestSchema('/schemas/json/layout/local-only.schema.v1.json');
    expect(response.status).toBe(404);
  });

  it.each([
    ['/schemas/%2e%2e/private.json', 403],
    ['/schemas/%', 400],
  ] as const)('rejects invalid schema path %s', async (requestPath, status) => {
    expect((await requestSchema(requestPath)).status).toBe(status);
  });
});
