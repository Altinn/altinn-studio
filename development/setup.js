const giteaApi = require('./utils/gitea-api.js');
const waitFor = require('./utils/wait-for.js');
const runCommand = require('./utils/run-command.js');
const ensureDotEnv = require('./utils/ensure-dot-env.js');
const dnsIsOk = require('./utils/check-if-dns-is-correct.js');
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
const createTestDepTeams = async (env) => {
  const allTeams = [
    {
      name: 'Deploy-AT21',
      permission: 'write',
      description: 'Deploy til AT21',
      includes_all_repositories: true,
    },
    {
      name: 'Deploy-AT22',
      permission: 'write',
      description: 'Deploy til AT22',
      includes_all_repositories: true,
    },
    {
      name: 'Deploy-AT23',
      permission: 'write',
      description: 'Deploy til AT23',
      includes_all_repositories: true,
    },
    {
      name: 'Deploy-AT24',
      permission: 'write',
      description: 'Deploy til AT24',
      includes_all_repositories: true,
    },
    {
      name: 'Deploy-TT02',
      permission: 'write',
      description: 'Deploy til TT02',
      includes_all_repositories: true,
    },
    {
      name: 'Deploy-YT01',
      permission: 'write',
      description: 'Deploy til YT01',
      includes_all_repositories: true,
    },
    {
      name: 'Devs',
      permission: 'write',
      description: 'All application developers',
      includes_all_repositories: true,
    },
    {
      name: 'KunLes',
      permission: 'read',
      description: 'Test av kun lesetilgang',
      includes_all_repositories: true,
    },
  ];

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
          team
        ),
      });
    }
  }
};

const addUserToSomeTestDepTeams = async (env) => {
  const teams = await giteaApi({
    path: `/repos/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
  for (const teamName of ['Owners', 'Deploy-TT02', 'Devs']) {
    const existing = teams.find((t) => t.name === teamName);
    await giteaApi({
      path: `/repos/api/v1/teams/${existing.id}/members/${env.GITEA_ADMIN_USER}`,
      method: 'PUT',
      user: env.GITEA_ADMIN_USER,
      pass: env.GITEA_ADMIN_PASS,
    });
  }
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

const addReleaseAndDeployTestDataToDb = async () => {
  runCommand(
    [`docker exec -i studio-db psql`, `-U designer_admin designerdb`, `< db/data.sql`].join(' ')
  );
};

const script = async () => {
  const currentEnv = ensureDotEnv();
  await startingDockerCompose();
  const dnsOk = await dnsIsOk('studio.localhost');
  if (dnsOk) {
    await waitFor('http://studio.localhost/repos/');
    await createAdminUser(currentEnv);
    await ensureAdminPassword(currentEnv);
    await createTestDepOrg(currentEnv);
    await createTestDepTeams(currentEnv);
    await addUserToSomeTestDepTeams(currentEnv);
    await createCypressEnvFile(currentEnv);
    await addReleaseAndDeployTestDataToDb();
    process.exit(0);
  } else {
    console.error(
      "DNS entry for studio.localhost does not resolve to 127.0.0.1. Check that it is set in  /etc/hosts"
    );
    process.exit(1);
  }
};

script().then();
