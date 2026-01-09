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
      url: [`${BASE_URL}/${APP_PATH}/#/`],
      startServerCommand: process.env.ENV === 'CI' ? '' : 'yarn serve 8080',
      startServerReadyPattern: String.raw`Available on:\n\s*http://127\.0\.0\.1:8080`,
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
