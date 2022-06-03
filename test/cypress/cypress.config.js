const { defineConfig } = require('cypress');
const path = require('path');
const fs = require('fs-extra');

module.exports = defineConfig({
  env: {
    multiData2Stage: 'frontend-test',
    stateless: 'stateless-app',
    anonymous: 'anonymous-stateless-app'
  },
  e2e: {
    setupNodeEvents(on, config) {
      var pathToConfig = 'e2e/config';
      switch (config.env.environment) {
        case 'local':
          return getConfigurationByFile(pathToConfig, 'local');
        case 'at21':
          return getConfigurationByFile(pathToConfig, 'at21');
        case 'at22':
          return getConfigurationByFile(pathToConfig, 'at22');
        case 'tt02':
          return getConfigurationByFile(pathToConfig, 'tt02');
      }
      return config;
    },
    specPattern: 'e2e/integration/',
    supportFile: 'e2e/support/index.js',
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

