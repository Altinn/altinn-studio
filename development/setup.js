const giteaApi = require('./utils/gitea-api.js');
const waitFor = require('./utils/wait-for.js');
const runCommand = require('./utils/run-command.js');
const ensureDotEnv = require('./utils/ensure-dot-env.js');
const dnsIsOk = require('./utils/check-if-dns-is-correct.js');
const createCypressEnvFile = require('./utils/create-cypress-env-file.js');
const path = require('path');
const writeEnvFile = require('./utils/write-env-file.js');
const waitForHealthy = require('./utils/wait-for-healthy.js');

const startingDockerCompose = () => runCommand('docker compose up -d --remove-orphans --build');
const buildAndStartComposeService = (service) =>
  runCommand(`docker compose up -d ${service} --build`);

const createUser = (username, password, admin) =>
  runCommand(
    [
      `docker exec studio-repositories gitea admin user create`,
      `--username ${username}`,
      `--password ${password}`,
      `--email ${username}@digdir.no`,
      admin ? `--admin` : undefined,
      `--must-change-password=false`,
    ].join(' '),
  );

const createTestDepOrg = (env) =>
  giteaApi({
    path: '/api/v1/orgs',
    method: 'POST',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
    body: {
      username: env.GITEA_ORG_USER,
      full_name: 'Testdepartementet',
      description: 'Internt organisasjon for test av løsning',
    },
  });
const createTestDepTeams = async (env) => {
  const allTeams = require(path.resolve(__dirname, 'data', 'gitea-teams.json'));

  const existingTeams = await giteaApi({
    path: `/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  for (const team of allTeams) {
    const existing = existingTeams.find((t) => t.name === team.name);
    if (!existing) {
      await giteaApi({
        path: `/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
        method: 'POST',
        user: env.GITEA_ADMIN_USER,
        pass: env.GITEA_ADMIN_PASS,
        body: Object.assign(
          {
            units: ['repo.code', 'repo.issues', 'repo.pulls', 'repo.releases'],
          },
          team,
        ),
      });
    }
  }
};

const createOidcClientIfNotExists = async (env) => {
  const clients = await giteaApi({
    path: `/api/v1/user/applications/oauth2`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  const shouldCreateClient = !clients.some((app) => app.name === 'LocalTestOidcClient');
  if (!shouldCreateClient) {
    return env;
  }

  var createdClient = await giteaApi({
    path: `/api/v1/user/applications/oauth2`,
    method: 'POST',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
    body: {
      confidential_client: true,
      name: 'LocalTestOidcClient',
      redirect_uris: ['http://studio.localhost/signin-oidc'],
    },
  });

  env.CLIENT_ID = createdClient.client_id;
  env.CLIENT_SECRET = createdClient.client_secret;

  return env;
};

const addUserToSomeTestDepTeams = async (env) => {
  const teams = await giteaApi({
    path: `/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  for (const teamName of [
    'Owners',
    'Deploy-TT02',
    'Devs',
    'Deploy-AT21',
    'Deploy-AT22',
    'Resources',
    'Resources-Publish-AT21',
    'Resources-Publish-AT22',
    'Resources-Publish-AT23',
    'Resources-Publish-AT24',
    'Resources-Publish-TT02',
    'AccessLists-AT21',
    'AccessLists-AT22',
    'AccessLists-AT23',
    'AccessLists-AT24',
    'AccessLists-TT02',
  ]) {
    const existing = teams.find((t) => t.name === teamName);

    await giteaApi({
      path: `/api/v1/teams/${existing.id}/members/${env.GITEA_ADMIN_USER}`,
      method: 'PUT',
      user: env.GITEA_ADMIN_USER,
      pass: env.GITEA_ADMIN_PASS,
    });
  }
  for (const teamName of [
    'Owners',
    'Deploy-TT02',
    'Devs',
    'Deploy-AT21',
    'Deploy-AT22',
    'Resources',
    'Resources-Publish-AT21',
    'Resources-Publish-AT22',
    'Resources-Publish-AT23',
    'Resources-Publish-AT24',
    'Resources-Publish-TT02',
    'AccessLists-AT21',
    'AccessLists-AT22',
    'AccessLists-AT23',
    'AccessLists-AT24',
    'AccessLists-TT02',
  ]) {
    const existing = teams.find((t) => t.name === teamName);

    await giteaApi({
      path: `/api/v1/teams/${existing.id}/members/${env.GITEA_CYPRESS_USER}`,
      method: 'PUT',
      user: env.GITEA_ADMIN_USER,
      pass: env.GITEA_ADMIN_PASS,
    });
  }
};

const createContentRepo = async (user, pass, org) => {
  const repo = 'ttd-content';
  const filePathCodeList = 'CodeLists/exampleCodeList.json';
  const filePathTexts = 'Texts/exampleText.json';

  await giteaApi({
    path: `/api/v1/orgs/${org}/repos`,
    method: 'POST',
    user,
    pass,
    body: {
      name: repo,
    },
  });

  await giteaApi({
    path: `/api/v1/repos/${org}/${repo}/contents/${filePathCodeList}`,
    method: 'POST',
    user,
    pass,
    body: {
      content: Buffer.from(
        `[\n  {\n    "label": "someLabel",\n    "value": "someValue"\n  }\n]`,
      ).toString('base64'),
    },
  });

  await giteaApi({
    path: `/api/v1/repos/${org}/${repo}/contents/${filePathTexts}`,
    method: 'POST',
    user,
    pass,
    body: {
      content: Buffer.from(
        `{\n  "language": "nb",\n  "resources": [\n    {\n      "id": "test",\n      "value": "test"\n    }\n  ]\n}`,
      ).toString('base64'),
    },
  });
};

const setupEnvironment = async (env) => {
  buildAndStartComposeService('studio_db');
  buildAndStartComposeService('studio_repositories');
  await waitForHealthy('studio-repositories');

  createUser(env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS, true);
  createUser(env.GITEA_CYPRESS_USER, env.GITEA_CYPRESS_PASS, false);
  await createTestDepOrg(env);
  await createTestDepTeams(env);
  await addUserToSomeTestDepTeams(env);
  await createContentRepo(env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS, env.GITEA_ORG_USER);

  const envWithRunnerToken = await setupRunnersToken(env);
  const newEnv = await createOidcClientIfNotExists(envWithRunnerToken);

  await createCypressEnvFile(env);

  return newEnv;
};

const setupRunnersToken = async (env) => {
  const runnersToken = await giteaApi({
    path: `/api/v1/orgs/${env.GITEA_ORG_USER}/actions/runners/registration-token`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  env.GITEA_RUNNER_REGISTRATION_TOKEN = runnersToken.token;
  return env;
};

const script = async () => {
  const env = ensureDotEnv();
  await dnsIsOk('studio.localhost');
  if (!(env.IGNORE_DOCKER_DNS_LOOKUP === 'true')) {
    await dnsIsOk('host.docker.internal');
  }

  const result = await setupEnvironment(env);
  if (result) {
    writeEnvFile(result);
  }

  startingDockerCompose();
  await waitFor('http://studio.localhost', 120);

  process.exit(0);
};

script()
  .then()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
