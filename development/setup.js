const giteaApi = require('./utils/gitea-api.js');
const waitFor = require('./utils/wait-for.js');
const runCommand = require('./utils/run-command.js');
const ensureDotEnv = require('./utils/ensure-dot-env.js');
const dnsIsOk = require('./utils/check-if-dns-is-correct.js');
const createCypressEnvFile = require('./utils/create-cypress-env-file.js');
const path = require('path');
const writeEnvFile = require('./utils/write-env-file.js');

const startingDockerCompose = () => runCommand('docker compose up -d --remove-orphans');

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

const ensureUserPassword = (username, password) =>
  runCommand(
    [
      `docker exec studio-repositories gitea admin user change-password`,
      `--username ${username}`,
      `--password ${password}`,
    ].join(' '),
  );

const createTestDepOrg = (env) =>
  giteaApi({
    path: '/repos/api/v1/orgs',
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
    path: `/repos/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  for (const team of allTeams) {
    const existing = existingTeams.find((t) => t.name === team.name);
    if (!existing) {
      await giteaApi({
        path: `/repos/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
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
    path: `/repos/api/v1/user/applications/oauth2`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  const shouldCreateClient = !clients.some((app) => app.name === 'LocalTestOidcClient');
  if (!shouldCreateClient) {
    return;
  }

  var createdClient = await giteaApi({
    path: `/repos/api/v1/user/applications/oauth2`,
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

  writeEnvFile(env);
  // reload designer with new clientid and secret
  startingDockerCompose();
};

const addUserToSomeTestDepTeams = async (env) => {
  const teams = await giteaApi({
    path: `/repos/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
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
      path: `/repos/api/v1/teams/${existing.id}/members/${env.GITEA_ADMIN_USER}`,
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
      path: `/repos/api/v1/teams/${existing.id}/members/${env.GITEA_CYPRESS_USER}`,
      method: 'PUT',
      user: env.GITEA_ADMIN_USER,
      pass: env.GITEA_ADMIN_PASS,
    });
  }
};

const addReleaseAndDeployTestDataToDb = async () =>
  runCommand(
    [
      `docker exec -i studio-db psql`,
      `-U designer_admin designerdb`,
      `< development/db/data.sql`,
    ].join(' '),
  );

const script = async () => {
  const env = ensureDotEnv();
  await dnsIsOk('studio.localhost');
  if (!(env.IGNORE_DOCKER_DNS_LOOKUP === 'true')) {
    await dnsIsOk('host.docker.internal');
  }
  await startingDockerCompose();
  await waitFor('http://studio.localhost/repos/');
  await createUser(env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS, true);
  await ensureUserPassword(env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS);
  await createUser(env.GITEA_CYPRESS_USER, env.GITEA_CYPRESS_PASS, false);
  await ensureUserPassword(env.GITEA_CYPRESS_USER, env.GITEA_CYPRESS_PASS);
  await createTestDepOrg(env);
  await createTestDepTeams(env);
  await addUserToSomeTestDepTeams(env);
  await createOidcClientIfNotExists(env);
  await createCypressEnvFile(env);
  await addReleaseAndDeployTestDataToDb();
  process.exit(0);
};

script().then().catch(console.error);
