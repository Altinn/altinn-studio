/* eslint-disable no-console */
// Script to run all Cypress tests for all apps. This will start one app, run all tests for that app until completion,
// then start the next app and run all tests for that app until completion, and so on.

import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { existsSync, mkdirSync, readdirSync, renameSync } from 'fs';

const apps = readdirSync('./test/e2e/integration');
const env = dotenv.config({ quiet: true }).parsed || {};
let artifactsDir = './test/run-all-artifacts';
let environment: string | undefined;

const allArgs = process.argv.slice(2);

// Figure out if the user passed --artifacts-dir and set the artifacts directory accordingly
if (allArgs.includes('--artifacts-dir')) {
  const index = allArgs.indexOf('--artifacts-dir');
  artifactsDir = allArgs[index + 1];
  allArgs.splice(index, 2);
}

// Inform the user to provide som arguments for cypress
if (allArgs.length === 0) {
  console.log(`Please provide arguments for Cypress. For example: --env environment=podman --config retries=1`);
  process.exit(1);
}

// Figure out which environment to run the tests in (passed via -e or --env, with the
// argument being comma-separated key-value pairs)
const envIndex = allArgs.findIndex((arg) => arg === '-e' || arg === '--env');
if (envIndex !== -1) {
  const envArg = allArgs[envIndex + 1];
  environment = envArg
    .split(',')
    .find((arg) => arg.startsWith('environment='))
    ?.split('=')[1];
}

if (!environment) {
  console.log(`Please provide an environment using --env environment=<value>`);
  process.exit(1);
}

// Valid environment values correspond to the files in test/e2e/config/*.json
if (environment && !existsSync(`./test/e2e/config/${environment}.json`)) {
  console.log(`Invalid environment: ${environment}`);
  process.exit(1);
}

if (environment !== 'tt02' && !env.CYPRESS_APPS_DIR) {
  console.log(`Please set CYPRESS_APPS_DIR in your .env file to the directory where the apps are located.`);
  process.exit(1);
}

const appsDir = env.CYPRESS_APPS_DIR;

if (environment !== 'tt02') {
  // Make sure every found test directory has a matching app
  const appDirs = readdirSync(appsDir);
  const appDirsSet = new Set(appDirs);
  const missingApps = apps.filter((app) => !appDirsSet.has(app));
  if (missingApps.length > 0) {
    console.log(`The following apps are missing from '${appsDir}': ${missingApps.join(', ')}`);
    process.exit(1);
  }
}

const startTime = new Date().toISOString().replace(/:/g, '-');

console.log('Cypress arguments:', ...allArgs);
console.log(`Artifacts will be stored in: ${artifactsDir}/${startTime}-<app-name> (use --artifacts-dir to change)`);
console.log('Preparing to run Cypress tests for the following apps:');
for (const app of apps) {
  console.log(`- ${app}`);
}

console.log(``);
async function runAll() {
  for (const app of apps) {
    if (environment === 'tt02') {
      await runCypressTests(app);
      continue;
    }

    console.log(`Starting app: ${app}`);
    const proc = spawn('dotnet', ['run'], { cwd: `${appsDir}/${app}/App` });
    let successful = false;

    // Connect to the output and wait until we find the line `Now listening on: http://[::]:5005`
    proc.stdout.on('data', async (data) => {
      const line = data.toString().trim();
      if (line.includes('Now listening on: http://[::]:5005')) {
        console.log(`App started successfully, running test suite`);
        successful = true;
        await runCypressTests(app);
        proc.kill();
      }
    });

    proc.on('close', (code) => {
      if (!successful) {
        console.error(`App failed to start, code ${code}`);
      }
    });

    await new Promise((resolve) => proc.on('close', resolve));
  }
}

async function runCypressTests(app: string) {
  const proc = spawn('npx', ['cypress', 'run', ...allArgs, '-s', `test/e2e/integration/${app}/*.ts`], {
    stdio: 'inherit',
  });

  await new Promise((resolve) => proc.on('close', resolve));

  // When the tests are done, there may be screenshots, videos, etc in the main test dir. We'll clean those up
  // and move them to the artifacts dir, in sub-folders for each test app (and the timestamp when our tests started)
  const artifactsAppDir = `${artifactsDir}/${startTime}-${app}`;
  const sourceArtifacts = [
    './test/screenshots',
    './test/videos',
    './test/reports',
    './test/redux-history',
    './test/logs',
  ];

  mkdirSync(artifactsAppDir, { recursive: true });
  for (const source of sourceArtifacts) {
    if (!existsSync(source)) {
      continue;
    }
    renameSync(source, `${artifactsAppDir}/${source.split('/').pop()}`);
  }
}

runAll().then(() => {
  console.log('All apps have been started and all tests have been run');
  process.exit(0);
});
