/* eslint-disable no-console */
// Script to run all Cypress tests for all apps. This will start one app, run all tests for that app until completion,
// then start the next app and run all tests for that app until completion, and so on.

import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'fs';
import { resolve } from 'path';

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

const appsDir = environment === 'tt02' ? undefined : resolve(env.CYPRESS_APPS_DIR || '../../test/apps');

if (environment !== 'tt02') {
  if (!appsDir || !existsSync(appsDir)) {
    console.log(`Apps directory does not exist: ${appsDir}`);
    process.exit(1);
  }

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
  if (environment !== 'tt02') {
    await runStudioctl(['servers', 'up']);
  }

  for (const app of apps) {
    if (environment === 'tt02') {
      await runCypressTests(app);
      continue;
    }

    console.log(`Starting app: ${app}`);
    await startApp(app);
    try {
      await waitForLocaltestApp(app);
      await runCypressTests(app);
    } finally {
      await stopApp(app);
    }
  }
}

async function runCypressTests(app: string) {
  try {
    await runProcess('npx', ['cypress', 'run', ...allArgs, '-s', `test/e2e/integration/${app}/*.ts`]);
  } finally {
    // Keep Cypress artifacts even when the test process fails.
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
}

async function startApp(app: string) {
  await runStudioctl(['run', '--mode', 'docker', '--detach', '--random-host-port', '--path', appPath(app)]);
}

async function stopApp(app: string) {
  // TODO: "studioctl stop"
  const appContainerIds = (
    await runProcessOutput('docker', [
      'ps',
      '-aq',
      '--filter',
      'label=altinn.studio/cli=app',
      '--filter',
      'label=altinn.studio/app-discovery=true',
      '--filter',
      'label=altinn.studio/cli-kind=app',
      '--filter',
      `label=altinn.studio/app-path=${appPath(app)}`,
    ])
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (appContainerIds.length === 0) {
    return;
  }

  console.log(`Stopping app: ${app}`);
  await runProcess('docker', ['rm', '-f', ...appContainerIds]);
}

async function waitForLocaltestApp(app: string) {
  if (!appsDir) {
    throw new Error('appsDir is required when waiting for local apps');
  }

  const appId = readAppId(app);
  const url = new URL(`${appId}/`, cypressBaseUrl()).toString();
  const deadline = Date.now() + 180_000;
  let lastStatus = 'no response';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      lastStatus = response.status.toString();
      if (response.status < 500 && response.status !== 404) {
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timed out waiting for ${appId} at ${url}. Last status: ${lastStatus}`);
}

function readAppId(app: string) {
  if (!appsDir) {
    throw new Error('appsDir is required when reading app metadata');
  }

  const metadata = JSON.parse(readFileSync(resolve(appsDir, app, 'App/config/applicationmetadata.json'), 'utf8')) as {
    id?: string;
  };
  if (!metadata.id) {
    throw new Error(`Missing app id in applicationmetadata.json for ${app}`);
  }
  return metadata.id;
}

function appPath(app: string) {
  if (!appsDir) {
    throw new Error('appsDir is required when running local apps');
  }
  return resolve(appsDir, app);
}

function cypressBaseUrl() {
  const config = JSON.parse(readFileSync(`./test/e2e/config/${environment}.json`, 'utf8')) as { baseUrl?: string };
  if (!config.baseUrl) {
    throw new Error(`Missing baseUrl in Cypress config for ${environment}`);
  }
  return config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`;
}

async function runProcess(command: string, args: string[], env = process.env) {
  const proc = spawn(command, args, { stdio: 'inherit', env });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(`${command} exited with code ${exitCode}`);
  }
}

async function runProcessOutput(command: string, args: string[], env = process.env) {
  const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env });
  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data) => {
    stdout += data;
  });
  proc.stderr.on('data', (data) => {
    stderr += data;
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(`${command} exited with code ${exitCode}: ${stderr.trim()}`);
  }

  return stdout;
}

async function runStudioctl(args: string[]) {
  await runProcess('studioctl', args);
}

runAll()
  .then(() => {
    console.log('All apps have been started and all tests have been run');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
