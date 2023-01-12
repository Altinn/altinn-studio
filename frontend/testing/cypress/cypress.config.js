const { defineConfig } = require('cypress');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    supportFile: 'src/support/index.js',
    specPattern: 'src/integration/',
    setupNodeEvents(on, config) {
      return require(path.resolve(
        __dirname,
        'config',
        `${config.env.environment || 'local'}.json`
      ));
    },
  },
  video: false,
  fixturesFolder: 'src/fixtures',
  downloadsFolder: 'downloads',
  screenshotOnRunFailure: true,
  screenshotsFolder: 'screenshots',
  trashAssetsBeforeRuns: true,
  videosFolder: 'videos',
  viewportHeight: 768,
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
});
