/* eslint-disable @typescript-eslint/no-require-imports */
const { defineConfig } = require('cypress');
const { vitePreprocessor } = require('cypress-vite');
const path = require('node:path');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const env = require('dotenv').config();
const configureCypressShard = require('./scripts/cypress-shard');

const CYPRESS_WINDOW_WIDTH = env.parsed?.CYPRESS_WINDOW_WIDTH || 1920;
const CYPRESS_WINDOW_HEIGHT = env.parsed?.CYPRESS_WINDOW_HEIGHT || 1080;

// noinspection JSUnusedGlobalSymbols
module.exports = defineConfig({
  allowCypressEnv: false,
  e2e: {
    setupNodeEvents(on, config) {
      const snapshotsPath = path.resolve('snapshots.json');
      require('cypress-terminal-report/src/installLogsPrinter')(on, { printLogsToConsole: 'always' });
      on(
        'file:preprocessor',
        vitePreprocessor({
          configFile: path.resolve(__dirname, 'vite.config.cypress.mts'),
          configLoader: 'native',
        }),
      );

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron') {
          launchOptions.preferences.width = CYPRESS_WINDOW_WIDTH;
          launchOptions.preferences.height = CYPRESS_WINDOW_HEIGHT;
          launchOptions.preferences.webPreferences = {
            ...(launchOptions.preferences.webPreferences || {}),
            webSecurity: false,
          };
        }
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push(`--window-size=${CYPRESS_WINDOW_WIDTH},${CYPRESS_WINDOW_HEIGHT}`);
        }

        // Adding chromeWebSecurity: false
        if (browser.name === 'chrome') {
          launchOptions.args.push('--disable-web-security');
        }

        return launchOptions;
      });

      on('after:spec', async (_spec, results) => {
        if (results && results.video) {
          // Do we have failures for any retry attempts?
          const failures = results.tests.some((test) => test.attempts.some((attempt) => attempt.state === 'failed'));
          if (!failures) {
            // delete the video if the spec passed and no tests retried
            await fs.unlink(results.video);
          }
        }
      });

      on('task', {
        /** @see snapshot.ts */
        async readSnapshot(key) {
          const snapshots = JSON.parse(await fs.readFile(snapshotsPath, { encoding: 'utf8' }));
          return snapshots[key];
        },
        async snapshotExists(key) {
          if (!existsSync(snapshotsPath)) {
            return false;
          }
          const snapshots = JSON.parse(await fs.readFile(snapshotsPath, { encoding: 'utf8' }));
          return Object.prototype.hasOwnProperty.call(snapshots, key);
        },
        async writeSnapshot({ key, value }) {
          const current = existsSync(snapshotsPath)
            ? JSON.parse(await fs.readFile(snapshotsPath, { encoding: 'utf8' }))
            : {};
          await fs.writeFile(snapshotsPath, JSON.stringify({ ...current, [key]: value }, null, 2));
          return null;
        },
      });

      const validEnvironments = ['localtest', 'tt02'];
      if (validEnvironments.includes(config.env.environment)) {
        return getConfigurationByFile(config.env.environment).then((fileConfig) => {
          const configured = {
            ...config,
            ...fileConfig,
            env: {
              ...config.env,
              ...fileConfig.env,
            },
            expose: {
              ...config.expose,
              ...fileConfig.expose,
              // Specs that assert on backend-local date/time values need the backend's timezone.
              // Only in localtest does the app backend run on the same machine as Cypress, so only
              // then is the machine timezone valid - read it here in the Node process, since the
              // browser's timezone may be emulated via CDP and cannot be trusted. Against remote
              // environments (tt02) this is deliberately left unset; specs fall back to UTC, which
              // is what those backends run in.
              ...(config.env.environment === 'localtest'
                ? { machineTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
                : {}),
            },
          };

          return configureCypressShard(configured, {
            specRoot: path.resolve(__dirname, 'test/e2e/integration'),
            timingsFile: path.resolve(__dirname, 'test/e2e/cypress-timings.json'),
            total: process.env.E2E_SHARD_TOTAL,
            number: process.env.E2E_SHARD_NUMBER,
          });
        });
      }

      throw new Error(`Unknown environment "${config.env.environment}"
Valid environments are:
- ${validEnvironments.join('\n- ')}`);
    },
    specPattern: ['test/e2e/integration/', 'test/e2e/manual/'],
    supportFile: 'test/e2e/support/index.ts',
  },
  // cypress-axe locates axe-core with `require.resolve`, which throws "require is not defined" in a
  // browser bundle (webpack provided a bare `require` inside bundled modules, Rolldown does not),
  // and its fallback path assumes axe-core sits in this project's node_modules - in this monorepo
  // Yarn hoists it to the repo root. Resolve it here in the Node process instead and hand it to
  // `cy.injectAxe` (see the command override in test/e2e/support/custom.ts).
  expose: {
    axeCorePath: require.resolve('axe-core/axe.min.js'),
    // Percy uses this public local endpoint to communicate with its CLI. Exposing it prevents
    // @percy/cypress from falling back to the disabled Cypress.env() API when Percy is not running.
    PERCY_SERVER_ADDRESS: process.env.PERCY_SERVER_ADDRESS || 'http://localhost:5338',
  },
  fixturesFolder: 'test/e2e/fixtures',
  downloadsFolder: 'test/downloads',
  screenshotOnRunFailure: true,
  screenshotsFolder: 'test/screenshots',
  trashAssetsBeforeRuns: true,
  video: env.parsed?.CYPRESS_RECORD_VIDEO === 'true',
  videosFolder: 'test/videos',
  videoCompression: JSON.parse(env.parsed?.CYPRESS_VIDEO_COMPRESSION || '32'),
  viewportHeight: 768,
  viewportWidth: 1536,
  requestTimeout: 20000,
  defaultCommandTimeout: 20000,
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'test/reports/result-[hash].xml',
  },
  retries: {
    runMode: 1,
    openMode: 0,
  },
});

async function getConfigurationByFile(file) {
  const pathToJsonDataFile = path.resolve('test/e2e/config', `${file}.json`);
  return JSON.parse((await fs.readFile(pathToJsonDataFile)).toString());
}
