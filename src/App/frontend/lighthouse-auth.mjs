#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://local.altinn.cloud';
const USER_ID = '1337'; // Test user ID
const AUTH_LEVEL = '2'; // Authentication level

async function loginAndRunLighthouse() {
  console.log('🔐 Logging in to localtest...');

  try {
    // Step 1: Get initial page and extract anti-forgery token
    const initialResponse = execSync(`curl -s -c cookies.txt "${BASE_URL}/"`, { encoding: 'utf8' });
    const tokenMatch = initialResponse.match(/__RequestVerificationToken[^>]*value="([^"]*)"/);

    if (!tokenMatch) {
      throw new Error('Failed to extract anti-forgery token');
    }

    const antiForgeryToken = tokenMatch[1];
    console.log(`🔑 Anti-forgery token: ${antiForgeryToken.substring(0, 20)}...`);

    // Step 2: Login with form data
    const loginCmd =
      `curl -s -b cookies.txt -c cookies.txt ` +
      `-X POST ` +
      `-H "Content-Type: application/x-www-form-urlencoded" ` +
      `-d "__RequestVerificationToken=${antiForgeryToken}" ` +
      `-d "UserSelect=${USER_ID}" ` +
      `-d "AuthenticationLevel=${AUTH_LEVEL}" ` +
      `-d "action=start" ` +
      `-w "%{http_code}" ` +
      `"${BASE_URL}/Home/LogInTestUser"`;

    const loginResponse = execSync(loginCmd, { encoding: 'utf8' });
    console.log(`📝 Login response code: ${loginResponse}`);

    // Step 3: Extract JWT token from cookies
    const cookiesContent = fs.readFileSync('cookies.txt', 'utf8');
    const jwtMatch = cookiesContent.match(/AltinnStudioRuntime\s+([^\s\n]+)/);
    const antiForgeryMatch = cookiesContent.match(/__RequestVerificationToken\s+([^\s\n]+)/);

    if (!jwtMatch) {
      throw new Error(`Failed to get JWT token from login. Cookies content:\n${cookiesContent}`);
    }

    const jwtToken = jwtMatch[1];
    const antiForgeryCookie = antiForgeryMatch ? antiForgeryMatch[1] : '';

    console.log(`🎫 JWT Token: ${jwtToken.substring(0, 50)}...`);

    // Step 4: Create temporary Lighthouse config with cookies
    const cookieHeader = `AltinnStudioRuntime=${jwtToken}${
      antiForgeryCookie ? `; __RequestVerificationToken=${antiForgeryCookie}` : ''
    }`;

    const tempConfig = {
      ci: {
        collect: {
          startServerCommand: 'yarn run start',
          url: ['http://local.altinn.cloud/ttd/component-library/#/'],
          startServerReadyTimeout: 20000,
          settings: {
            extraHeaders: {
              Cookie: cookieHeader,
            },
          },
        },
        upload: {
          target: 'temporary-public-storage',
        },
      },
    };

    const tempConfigPath = './lighthouserc-temp.js';
    fs.writeFileSync(tempConfigPath, `module.exports = ${JSON.stringify(tempConfig, null, 2)};`);

    console.log('🚀 Running Lighthouse CI with authentication...');

    // Step 5: Run Lighthouse CI with the temporary config
    execSync(`npx @lhci/cli@latest autorun --config="${tempConfigPath}"`, { stdio: 'inherit' });

    console.log('✅ Lighthouse run completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      fs.unlinkSync('cookies.txt');
      fs.unlinkSync('./lighthouserc-temp.js');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loginAndRunLighthouse();
}
export { loginAndRunLighthouse };
