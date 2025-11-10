/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */

// Configuration
const { BASE_URL, TEST_USER_ID, AUTH_LEVEL } = require('./lighthouse-config-constants');

/**
 * Puppeteer script for Lighthouse CI to handle authentication flow
 * @param {import('puppeteer').Browser} browser - The Puppeteer browser instance
 */
module.exports = async (browser) => {
  // launch browser for LHCI
  // Step 1: Navigate to login page
  const page = await browser.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  // Step 2: Fill in the login form
  console.log('📝 Filling login form...');

  // Select user from dropdown
  await page.select('select#UserSelect', TEST_USER_ID);
  console.log(`✅ Selected user: ${TEST_USER_ID}`);

  // Select authentication level
  await page.select('select#AuthenticationLevel', AUTH_LEVEL);
  console.log(`✅ Selected auth level: ${AUTH_LEVEL}`);

  // Step 3: Submit the form
  console.log('🚀 Submitting login form...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    page.click('button[name="action"][value="start"]'),
  ]);

  console.log('✅ Login submitted, waiting for redirect...');

  // Wait a bit for any additional redirects/loading
  await page.waitForNetworkIdle();

  // Close page
  await page.close();
};
