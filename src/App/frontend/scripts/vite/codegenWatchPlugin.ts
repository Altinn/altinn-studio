import { spawn } from 'node:child_process';
import type { Plugin } from 'vite';

function runCodegen(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // `yarn gen` so the dev server, the production build and CI all generate with the same runtime.
    const child = spawn('yarn gen', { shell: true, cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Codegen exited with code ${code}`))));
  });
}

const isCodegenInput = (file: string) => {
  // Watcher paths are not normalized, so they arrive with backslashes on Windows.
  const normalized = file.replaceAll('\\', '/');
  return /\/src\/layout\/.+\/config\.ts$/.test(normalized) || normalized.includes('/src/codegen/');
};

/**
 * Keeps the generated TypeScript files (*.generated.ts) up to date while the dev server runs.
 * On startup it runs the codegen (src/codegen/run.ts) to completion - the app cannot render
 * without the generated files, so a failure here aborts startup rather than leaving you with
 * a server serving stale output.
 */
export function codegenWatchPlugin(): Plugin {
  return {
    name: 'altinn:codegen-watch',
    apply: 'serve',
    async configureServer(server) {
      const logger = server.config.logger;
      // Codegen resolves its paths relative to the project root ('src/layout', 'schemas/json').
      // Vite's root defaults to process.cwd(), so this is normally the same directory - but it
      // follows along if the config ever sets an explicit root.
      const cwd = server.config.root;

      logger.info('Running codegen before starting the dev server...', { timestamp: true });
      await runCodegen(cwd);

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
          await runCodegen(cwd);
        } catch (error) {
          logger.error('Codegen failed', { timestamp: true, error });
        } finally {
          running = false;
          if (rerunQueued) {
            rerunQueued = false;
            void rerun();
          }
        }
      };

      // Bursts (a branch switch touching many config files, an editor saving twice) would otherwise
      // start a run on the first event and then queue a second, redundant one for the rest. Waiting
      // for the events to stop arriving first collapses the whole burst into a single run. The
      // mutex above is still needed: codegen takes far longer than this window.
      let timer: NodeJS.Timeout | undefined;
      const pendingFiles = new Set<string>();
      const scheduleRerun = (file: string) => {
        pendingFiles.add(file);
        clearTimeout(timer);
        timer = setTimeout(() => {
          const [first] = pendingFiles;
          const others = pendingFiles.size - 1;
          pendingFiles.clear();
          const changed = others > 0 ? `${first} and ${others} more` : first;
          logger.info(`Codegen input changed (${changed}), re-running codegen...`, { timestamp: true });
          void rerun();
        }, 200);
      };

      // Directory events are included here too, but they can never match isCodegenInput().
      server.watcher.on('all', (_event, file) => {
        if (isCodegenInput(file)) {
          scheduleRerun(file);
        }
      });
    },
  };
}
