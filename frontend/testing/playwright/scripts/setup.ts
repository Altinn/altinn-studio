import path from 'path';
import fs from 'fs';
import os from 'os';

// Configure the dotenv to read form the .env file on root of monorepo.
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const environment: Record<string, string> = {
  PLAYWRIGHT_TEST_BASE_URL: 'http://studio.localhost',
  PLAYWRIGHT_DESIGNER_APP_NAME: 'auto-test-app',

  PLAYWRIGHT_USER: process.env.GITEA_CYPRESS_USER,
  PLAYWRIGHT_PASS: process.env.GITEA_CYPRESS_PASS,
};

const getEnvFilePath = (): string => {
  return path.resolve(__dirname, '..', '.env');
};

const mapEnvironment = () => {
  return Object.keys(environment)
    .map((key) => [key, environment[key]].join('='))
    .join(os.EOL);
};

const updateEnvironmentVars = (): void => {
  const filePath: string = getEnvFilePath();
  console.table(environment);
  fs.writeFileSync(filePath, mapEnvironment(), { encoding: 'utf8', flag: 'w' });
};

(async (): Promise<void> => {
  console.log('----- SETUP PLAYWRIGHT ENVIRONMENT VARIABLES STARTED -----');
  if (!environment.PLAYWRIGHT_USER || !environment.PLAYWRIGHT_PASS) {
    console.error('Ensure to run `node setup.js` within development folder on root.');
    return;
  }
  updateEnvironmentVars();
  console.log('----- SETUP PLAYWRIGHT ENVIRONMENT VARIABLES DONE -----');
})();
