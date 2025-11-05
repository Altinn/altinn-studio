// Configuration
const BASE_URL = 'http://local.altinn.cloud';
const USER_ID = '1337.501337'; // Test user ID (userid.partyid format)
const AUTH_LEVEL = '2'; // Authentication level

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
  await page.select('select#UserSelect', USER_ID);
  console.log(`✅ Selected user: ${USER_ID}`);

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
