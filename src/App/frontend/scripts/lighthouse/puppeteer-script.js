/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */

// Configuration
const { BASE_URL, TEST_USER_ID, AUTH_LEVEL, APP_PATH } = require('./lighthouse-config-constants');

/**
 * Puppeteer script for Lighthouse CI to handle authentication flow
 * @param {import('puppeteer').Browser} browser - The Puppeteer browser instance
 */
module.exports = async (browser) => {
  const page = await browser.newPage();

  // Set the frontend version cookie
  await browser.setCookie({
    name: 'frontendVersion',
    value: 'http://localhost:8080/',
    url: BASE_URL,
    httpOnly: true,
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  console.log('📝 Filling login form...');

  // Wait max 10s for login elements to be present before interacting
  await page.waitForSelector('select#UserSelect', { timeout: 10000 });
  await page.select('select#UserSelect', TEST_USER_ID);
  console.log(`✅ Selected user: ${TEST_USER_ID}`);

  await page.select('select#AuthenticationLevel', AUTH_LEVEL);
  console.log(`✅ Selected auth level: ${AUTH_LEVEL}`);

  const appSelect = await page.$('select#AppPathSelection');
  if (appSelect) {
    await appSelect.select(APP_PATH);
    console.log(`✅ Selected app path: ${APP_PATH}`);
  }

  console.log('🚀 Submitting login form...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    page.click('button[name="action"][value="start"]'),
  ]);

  console.log('✅ Login submitted, waiting for redirect...');

  // Wait a bit for any additional redirects/loading
  await page.waitForNetworkIdle();

  await page.close();
};
