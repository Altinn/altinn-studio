/* eslint-disable @typescript-eslint/no-require-imports */

// This file and the scripts it points at stay CommonJS (`.cjs`) while the rest of the package is
// ESM: `@lhci/cli` `require()`s both its config and its puppeteerScript, and supports no other
// module format. Converting them to ESM fails inside lhci, not here.

// Configuration
const { BASE_URL, APP_PATH } = require('./scripts/lighthouse/lighthouse-config-constants.cjs');

const chromePath =
  process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || require('puppeteer').executablePath();

/**
 * Lighthouse CI configuration object
 * https://github.com/GoogleChrome/lighthouse-ci
 */
module.exports = {
  ci: {
    collect: {
      headful: false,
      url: [`${BASE_URL}/${APP_PATH}/`],
      startServerCommand: process.env.ENV === 'CI' ? '' : 'yarn serve 8080',
      startServerReadyPattern: String.raw`Available on:\n\s*http://127\.0\.0\.1:8080`,
      puppeteerScript: './scripts/lighthouse/puppeteer-script.cjs',
      puppeteerLaunchOptions: {
        headless: true,
        args: ['--disable-features=HttpsFirstBalancedModeAutoEnable', '--no-sandbox', '--disable-setuid-sandbox'],
      },

      chromePath,
    },
    upload: {
      target: process.env.LHCI_SERVER_URL ? 'lhci' : 'temporary-public-storage',
      serverBaseUrl: process.env.LHCI_SERVER_URL,
      token: process.env.LHCI_BUILD_TOKEN,
      basicAuth:
        process.env.LHCI_USERNAME && process.env.LHCI_PASSWORD
          ? {
              username: process.env.LHCI_USERNAME,
              password: process.env.LHCI_PASSWORD,
            }
          : undefined,
    },
  },
};
