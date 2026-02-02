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
      startServerCommand: 'yarn run serve 8080',
      url: [`${BASE_URL}/${APP_PATH}/`],
      startServerReadyPattern: 'Available on:\\n\\s*http://127\\.0\\.0\\.1:8080',
      puppeteerScript: './scripts/lighthouse/puppeteer-script.js',
      puppeteerLaunchOptions: {
        headless: true,
        args: ['--disable-features=HttpsFirstBalancedModeAutoEnable', '--no-sandbox', '--disable-setuid-sandbox'],
      },

      chromePath: require('puppeteer').executablePath(),
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
