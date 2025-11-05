// Configuration
const BASE_URL = 'http://local.altinn.cloud';
const APP_PATH = 'ttd/component-library'; // App path

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
      puppeteerScript: './puppeteer-script.js',
      puppeteerLaunchOptions: {
        headless: true,
        args: ['--disable-features=HttpsFirstBalancedModeAutoEnable'],
      },
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      chromePath: require('puppeteer').executablePath(),
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
