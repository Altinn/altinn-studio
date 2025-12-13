/* eslint-disable no-console */
// Script to check if k6 is installed and provide setup instructions

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const INSTALL_URL = 'https://grafana.com/docs/k6/latest/set-up/install-k6/';

(async () => {
  try {
    const { stdout } = await execFileAsync('k6', ['version']);
    console.log('✅ k6 is installed');
    console.log(`Version: ${stdout.trim()}`);
    process.exit(0);
  } catch {
    console.error('❌ k6 is not installed or not accessible');
    console.log(`\n📦 To install k6, follow the instructions at ${INSTALL_URL}\n`);
    process.exit(1);
  }
})();
