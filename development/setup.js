const giteaApi = require('./utils/gitea-api.js');
const waitFor = require('./utils/wait-for.js');
const runCommand = require('./utils/run-command.js');
const ensureDotEnv = require('./utils/ensure-dot-env.js');
const path = require('path');
const fs = require('fs');

const startingDockerCompose = () => runCommand('docker compose up -d --remove-orphans');

const createAdminUser = (env) =>
  runCommand(
    [
      `docker exec studio-repositories gitea admin user create`,
      `--username ${env.GITEA_ADMIN_USER}`,
      `--password ${env.GITEA_ADMIN_PASS}`,
      `--email ${env.GITEA_ADMIN_USER}@digdir.no`,
      `--admin`,
      `--must-change-password=false`,
    ].join(' ')
  );

const ensureAdminPassword = (env) =>
  runCommand(
    [
      `docker exec studio-repositories gitea admin user change-password`,
      `--username ${env.GITEA_ADMIN_USER}`,
      `--password ${env.GITEA_ADMIN_PASS}`,
    ].join(' ')
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

const addUserToOwnersTeam = async (env) => {
  const teams = await giteaApi({
    path: `/repos/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
  await giteaApi({
    path: `/repos/api/v1/teams/${teams[0].id}/members/${env.GITEA_ADMIN_USER}`,
    method: 'PUT',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
};

const createCypressEnvFile = async (env) => {
  const tokenPrefix = 'setup.js';
  const envFile = {
    adminUser: env.GITEA_ADMIN_USER,
    adminPwd: env.GITEA_ADMIN_PASS,
    accessToken: '',
    useCaseUser: env.GITEA_ADMIN_USER,
    useCaseUserPwd: env.GITEA_ADMIN_PASS,
  };
  const allTokens = await giteaApi({
    path: `/repos/api/v1/users/${env.GITEA_ADMIN_USER}/tokens`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
  const deleteTokenOperations = [];
  allTokens.forEach((token) => {
    if (token.name.startsWith(tokenPrefix)) {
      deleteTokenOperations.push(
        giteaApi({
          path: `/repos/api/v1/users/${env.GITEA_ADMIN_USER}/tokens/${token.id}`,
          method: 'DELETE',
          user: env.GITEA_ADMIN_USER,
          pass: env.GITEA_ADMIN_PASS,
        })
      );
    }
  });
  const result = await giteaApi({
    path: `/repos/api/v1/users/${env.GITEA_ADMIN_USER}/tokens`,
    method: 'POST',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
    body: {
      name: tokenPrefix + ' ' + Date.now(),
    },
  });
  envFile.accessToken = result.sha1;
  await Promise.all(deleteTokenOperations);
  const cypressEnvFilePath = path.resolve(
    __dirname,
    '..',
    'frontend',
    'testing',
    'cypress',
    'cypress.env.json'
  );
  fs.writeFileSync(cypressEnvFilePath, JSON.stringify(envFile), 'utf-8');
  console.log('Wrote a new:', cypressEnvFilePath);
};

const ensureDeploymentEntry = async () => {
  runCommand(
    [`docker exec -i studio-db psql`, `-U designer_admin designerdb`, `< db/data.sql`].join(' ')
  );
};

const script = async () => {
  const currentEnv = ensureDotEnv();
  await startingDockerCompose();
  await waitFor('http://studio.localhost/repos/');
  await createAdminUser(currentEnv);
  await ensureAdminPassword(currentEnv);
  await createTestDepOrg(currentEnv);
  await addUserToOwnersTeam(currentEnv);
  await createCypressEnvFile(currentEnv);
  await ensureDeploymentEntry();
  process.exit(0);
};

script().then();
