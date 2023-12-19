const { defineConfig } = require('cypress');
const path = require('path');

module.exports = defineConfig({
  chromeWebSecurity: false,
  projectId: 'o7mikf',

  e2e: {
    experimentalRunAllSpecs: true,
    supportFile: 'src/support/index.js',
    specPattern: 'src/integration/',
    testIsolation: false,
    setupNodeEvents(on, config) {
      return require(
        path.resolve(__dirname, 'config', `${config.env.environment || 'local'}.json`),
      );
    },
  },

  video: false,
  fixturesFolder: 'src/fixtures',
  downloadsFolder: 'downloads',
  screenshotOnRunFailure: true,
  screenshotsFolder: 'screenshots',
  trashAssetsBeforeRuns: true,
  videosFolder: 'videos',
  viewportHeight: 1000,
  viewportWidth: 1536,
  requestTimeout: 10000,
  defaultCommandTimeout: 8000,
  reporter: 'junit',

  reporterOptions: {
    mochaFile: 'reports/result-[hash].xml',
  },

  retries: {
    runMode: 1,
    openMode: 0,
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
  },
});
