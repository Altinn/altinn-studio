const { defineConfig } = require('cypress');
const path = require('path');
const fs = require('fs-extra');

module.exports = defineConfig({
  e2e: {
    supportFile: 'e2e/support/index.js',
    specPattern: 'e2e/integration/',
    setupNodeEvents(on, config) {
      var pathToConfig = 'e2e/config';
      switch (config.env.environment) {
        case 'local':
          return getConfigurationByFile(pathToConfig, 'local');
        case 'dev':
          return getConfigurationByFile(pathToConfig, 'dev');
        case 'staging':
          return getConfigurationByFile(pathToConfig, 'staging');
        case 'prod':
          return getConfigurationByFile(pathToConfig, 'prod');
      }
      return config;
    },
  },
  video: false,
  fixturesFolder: 'e2e/fixtures',
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
    mochaFile: 'reports/result-[hash].xml'
  },
  retries: {
    runMode: 1,
    openMode: 0
  }
});

function getConfigurationByFile(pathToFile, file) {
  const pathToJsonDataFile = path.resolve(pathToFile, `${file}.json`);
  return fs.readJson(pathToJsonDataFile);
}

