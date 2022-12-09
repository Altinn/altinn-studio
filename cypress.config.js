const { defineConfig } = require('cypress');
const path = require('node:path');
const fs = require('node:fs/promises');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const validEnvironments = ['local', 'at21', 'at22', 'tt02'];

      if (validEnvironments.includes(config.env.environment)) {
        return getConfigurationByFile(config.env.environment);
      }

      throw new Error(`Unknown environment "${config.env.environment}"
Valid environments are:
- ${validEnvironments.join('\n- ')}`);
    },
    specPattern: 'cypress/e2e/integration/',
    supportFile: 'cypress/e2e/support/index.js',
  },
  video: false,
  fixturesFolder: 'cypress/e2e/fixtures',
  downloadsFolder: 'cypress/downloads',
  screenshotOnRunFailure: true,
  screenshotsFolder: 'cypress/screenshots',
  trashAssetsBeforeRuns: true,
  videosFolder: 'cypress/videos',
  viewportHeight: 768,
  viewportWidth: 1536,
  requestTimeout: 10000,
  defaultCommandTimeout: 8000,
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'cypress/reports/result-[hash].xml',
  },
  retries: {
    runMode: 1,
    openMode: 0,
  },
});

async function getConfigurationByFile(file) {
  const pathToJsonDataFile = path.resolve('cypress/e2e/config', `${file}.json`);
  return JSON.parse((await fs.readFile(pathToJsonDataFile)).toString());
}
