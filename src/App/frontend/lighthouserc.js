/* eslint-disable @typescript-eslint/no-require-imports */

// Configuration
const { BASE_URL, APP_PATH } = require('./scripts/lighthouse/lighthouse-config-constants');

/**
 * Lighthouse CI configuration object
 * https://github.com/GoogleChrome/lighthouse-ci
 */
module.exports = {
  ci: {
    collect: {
      headful: false,
      startServerCommand: 'yarn run start',
      url: [`${BASE_URL}/${APP_PATH}/#/`],
      puppeteerScript: './scripts/lighthouse/puppeteer-script.js',
      puppeteerLaunchOptions: {
        headless: true,
        args: ['--disable-features=HttpsFirstBalancedModeAutoEnable', '--no-sandbox', '--disable-setuid-sandbox'],
      },

      chromePath: require('puppeteer').executablePath(),
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
