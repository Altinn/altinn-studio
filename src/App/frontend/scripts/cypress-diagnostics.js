// Temporary CI diagnostics. Spec tracking stays in Node. A separate failure-only
// browser report preserves failures within a spec interrupted by a later hang.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function cypressDiagnostics(on) {
  const directory = process.env.CYPRESS_DIAGNOSTICS_DIR;
  const state = { completed: {} };
  function save(update) {
    if (!directory) {
      return;
    }
    Object.assign(state, update, { updatedAt: Date.now() });
    const file = path.join(directory, 'cypress.json');
    writeFileSync(`${file}.tmp`, JSON.stringify(state));
    renameSync(`${file}.tmp`, file);
  }
  if (directory) {
    on('before:run', ({ specs }) => save({ specs: specs.map((spec) => spec.absolute) }));
    on('before:spec', (spec) => save({ currentSpec: spec.absolute }));
  }
  return {
    browserLaunch(browser, options) {
      save({
        browser: { name: browser.name, version: browser.version },
        debugPort: Number(options.args.find((arg) => arg.startsWith('--remote-debugging-port='))?.split('=')[1]),
      });
    },
    afterSpec(spec, results) {
      if (!directory) {
        return;
      }
      if (results?.stats) {
        state.completed[spec.absolute] = {
          failures: results.stats.failures,
          tests: results.stats.tests,
          error: Boolean(results.error),
        };
      }
      save({ currentSpec: null });
    },
    remaining(config) {
      if (directory) {
        config.expose = { ...config.expose, CYPRESS_DIAGNOSTICS_URL: process.env.CYPRESS_DIAGNOSTICS_URL };
      }
      const remainingFile = process.env.CYPRESS_DIAGNOSTICS_REMAINING;
      if (directory && remainingFile) {
        const remaining = JSON.parse(readFileSync(remainingFile, 'utf8'));
        // The wrapper supplies absolute paths from this shard's before:run event.
        // Do not recompute sharding from the smaller recovery list.
        if (!remaining.length || remaining.some((spec) => !config.specPattern.includes(spec))) {
          throw new Error('Recovery specs do not match the original shard assignment.');
        }
        config.specPattern = remaining;
        config.trashAssetsBeforeRuns = false;
      }
      return config;
    },
  };
}
