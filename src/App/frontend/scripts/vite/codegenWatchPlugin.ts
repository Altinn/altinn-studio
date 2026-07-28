/* eslint-disable no-console */
import { execSync, spawn } from 'node:child_process';
import type { Plugin } from 'vite';

function getCodegenCommand(): string {
  // Check if bun is available for faster codegen execution
  try {
    execSync(process.platform === 'win32' ? 'where bun' : 'which bun', { stdio: 'pipe' });
    return 'bun src/codegen/run.ts';
  } catch {
    return 'npx tsx src/codegen/run.ts';
  }
}

function runCodegen(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, cwd: process.cwd(), stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Codegen exited with code ${code}`));
      }
    });
  });
}

const isCodegenInput = (file: string) => {
  const normalized = file.replaceAll('\\', '/');
  return (
    /\/src\/layout\/.+\/config\.ts$/.test(normalized) ||
    (normalized.includes('/src/codegen/') && !normalized.endsWith('.generated.ts'))
  );
};

/**
 * Keeps the generated TypeScript files (*.generated.ts) up to date while the dev server runs.
 * On startup it runs the codegen (src/codegen/run.ts) to completion, then re-runs it whenever
 * a component config or the codegen itself changes, using the dev server's own file watcher.
 * Replaces the old webpack CodegenWatchPlugin.
 */
export function codegenWatchPlugin(): Plugin {
  return {
    name: 'altinn:codegen-watch',
    apply: 'serve',
    async configureServer(server) {
      const codegenCommand = getCodegenCommand();

      console.log('Running codegen before starting the dev server...');
      await runCodegen(codegenCommand);

      // Re-run on changes, but never concurrently: a change arriving during a run queues
      // exactly one follow-up run.
      let running = false;
      let rerunQueued = false;
      const rerun = async () => {
        if (running) {
          rerunQueued = true;
          return;
        }
        running = true;
        try {
          await runCodegen(codegenCommand);
        } catch (error) {
          console.error('Codegen failed:', error);
        } finally {
          running = false;
          if (rerunQueued) {
            rerunQueued = false;
            void rerun();
          }
        }
      };

      const onFileEvent = (file: string) => {
        if (isCodegenInput(file)) {
          console.log(`Codegen input changed (${file}), re-running codegen...`);
          void rerun();
        }
      };
      server.watcher.on('add', onFileEvent);
      server.watcher.on('change', onFileEvent);
      server.watcher.on('unlink', onFileEvent);
    },
  };
}
