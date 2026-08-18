const giteaApi = require('./utils/gitea-api.js');
const waitFor = require('./utils/wait-for.js');
const runCommand = require('./utils/run-command.js');
const runCommandAsync = require('./utils/run-command-async.js');
const mapLimit = require('./utils/map-limit.js');
const ensureDotEnv = require('./utils/ensure-dot-env.js');
const dnsIsOk = require('./utils/check-if-dns-is-correct.js');
const createCypressEnvFile = require('./utils/create-cypress-env-file.js');
const path = require('path');
const writeEnvFile = require('./utils/write-env-file.js');
const waitForHealthy = require('./utils/wait-for-healthy.js');

// Lets compose delegate builds to buildx bake, which builds the services in parallel instead of one
// after another. Older compose versions ignore the variable.
process.env.COMPOSE_BAKE = process.env.COMPOSE_BAKE ?? 'true';

// pgadmin and redis-commander are developer tooling behind the "tools" compose profile. CI has no
// use for them, and pulling and starting them is pure overhead there.
const composeProfiles = process.env.CI === 'true' ? [] : ['--profile', 'tools'];
const compose = (...args) => ['docker compose', ...composeProfiles, ...args].join(' ');

// Everything the Gitea provisioning below needs. Starting them in one compose call lets compose
// build them in parallel, instead of once per invocation.
const bootstrapServices = ['studio_db', 'studio_repositories', 'fake_ansattporten'];

const startBootstrapServices = () =>
  runCommand(compose('up', '-d', '--build', ...bootstrapServices));

// The Designer image (full frontend build + dotnet publish) is by far the slowest step, and it does
// not depend on any of the Gitea provisioning. Building it in the background means the two overlap.
const buildRemainingServices = () => runCommandAsync('docker compose build');

const startEverything = () => runCommand(compose('up', '-d', '--remove-orphans'));

const userCreateCommand = (username, password, admin) =>
  [
    `gitea admin user create`,
    `--username ${username}`,
    `--password ${password}`,
    `--email ${username}@digdir.no`,
    admin ? `--admin` : undefined,
    `--must-change-password=false`,
  ]
    .filter(Boolean)
    .join(' ');

// One docker exec instead of one per user: the exec overhead dominates the actual work here.
// Creating a user that already exists fails, which is expected when the setup is re-run.
const createUsers = (env) =>
  runCommand(
    `docker exec studio-repositories sh -c '${[
      userCreateCommand(env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS, true),
      userCreateCommand(env.GITEA_CYPRESS_USER, env.GITEA_CYPRESS_PASS, false),
    ].join('; ')}'`,
    { allowFailure: true },
  );

const createOrganization = (user, pass, orgShortName, orgFullName, orgDescription) =>
  giteaApi({
    path: '/api/v1/orgs',
    method: 'POST',
    user: user,
    pass: pass,
    body: {
      username: orgShortName,
      full_name: orgFullName,
      description: orgDescription,
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

  const missingTeams = allTeams.filter((team) => !existingTeams.some((t) => t.name === team.name));

  await mapLimit(missingTeams, (team) =>
    giteaApi({
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
    }),
  );
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

const testDepTeamMemberships = [
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
  'Admin-TT02',
  'Admin-AT21',
  'Admin-AT22',
];

const addUserToSomeTestDepTeams = async (env) => {
  const teams = await giteaApi({
    path: `/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  const memberships = [env.GITEA_ADMIN_USER, env.GITEA_CYPRESS_USER].flatMap((username) =>
    testDepTeamMemberships.map((teamName) => {
      const team = teams.find((t) => t.name === teamName);
      if (!team) {
        throw new Error(`Team ${teamName} does not exist in org ${env.GITEA_ORG_USER}`);
      }
      return { teamId: team.id, username };
    }),
  );

  // These are independent of each other, so there is no reason to do them one at a time.
  await mapLimit(memberships, ({ teamId, username }) =>
    giteaApi({
      path: `/api/v1/teams/${teamId}/members/${username}`,
      method: 'PUT',
      user: env.GITEA_ADMIN_USER,
      pass: env.GITEA_ADMIN_PASS,
    }),
  );
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

  await Promise.all([
    giteaApi({
      path: `/api/v1/repos/${org}/${repo}/contents/${filePathCodeList}`,
      method: 'POST',
      user,
      pass,
      body: {
        content: Buffer.from(
          `[\n  {\n    "label": "someLabel",\n    "value": "someValue"\n  }\n]`,
        ).toString('base64'),
      },
    }),
    giteaApi({
      path: `/api/v1/repos/${org}/${repo}/contents/${filePathTexts}`,
      method: 'POST',
      user,
      pass,
      body: {
        content: Buffer.from(
          `{\n  "language": "nb",\n  "resources": [\n    {\n      "id": "test",\n      "value": "test"\n    }\n  ]\n}`,
        ).toString('base64'),
      },
    }),
  ]);
};

const setupEnvironment = async (env) => {
  startBootstrapServices();

  const remainingBuilds = buildRemainingServices();
  remainingBuilds.catch(() => {}); // rejection is handled where the build is awaited, below

  await waitForHealthy('studio-repositories');

  createUsers(env);
  createFakeAnsattportenAuthSource();
  linkUsersToFakeAnsattporten(env.GITEA_CYPRESS_USER);
  await Promise.all([
    createOrganization(
      env.GITEA_ADMIN_USER,
      env.GITEA_ADMIN_PASS,
      env.GITEA_ORG_USER,
      'Testdepartementet',
      'Internt organisasjon for test av løsning',
    ),
    createOrganization(
      env.GITEA_ADMIN_USER,
      env.GITEA_ADMIN_PASS,
      'als',
      'Altinn Studio',
      'Altinn Studio organization',
    ),
  ]);
  await createTestDepTeams(env);
  await addUserToSomeTestDepTeams(env);
  await createContentRepo(env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS, env.GITEA_ORG_USER);

  const envWithRunnerToken = await setupRunnersToken(env);
  const envWithOidcClient = await createOidcClientIfNotExists(envWithRunnerToken);
  const newEnv = await createPersonalAccessToken(envWithOidcClient);

  await createCypressEnvFile(env);

  await remainingBuilds;

  return newEnv;
};

const createFakeAnsattportenAuthSource = () => {
  const existing = require('child_process')
    .execSync('docker exec studio-repositories gitea admin auth list')
    .toString();
  if (existing.includes('fake-ansattporten')) {
    return;
  }
  runCommand(
    [
      `docker exec studio-repositories gitea admin auth add-oauth`,
      `--name=fake-ansattporten`,
      `--provider=openidConnect`,
      `--key=fake-client`,
      `--secret=fake-secret`,
      `--auto-discover-url=http://fake-ansattporten:8443/.well-known/openid-configuration`,
    ].join(' '),
  );
};

// Both links in one psql call: the statements are idempotent and independent, and the docker exec
// round trip costs more than the inserts themselves.
const linkUsersToFakeAnsattporten = (cypressUser) => {
  const link = (externalId, lowerName) =>
    `INSERT INTO external_login_user (external_id, user_id, login_source_id) SELECT '${externalId}', id, (SELECT id FROM login_source WHERE name = 'fake-ansattporten') FROM \\"user\\" WHERE lower_name = '${lowerName}' ON CONFLICT DO NOTHING;`;

  runCommand(
    `docker exec studio-db psql -U gitea -d giteadb -c "${[
      link('sub-29922149761', 'localgiteaadmin'),
      link('sub-10866898516', cypressUser.toLowerCase()),
    ].join(' ')}"`,
  );
};

const setupRunnersToken = async (env) => {
  const runnersToken = await giteaApi({
    path: `/api/v1/orgs/${env.GITEA_ORG_USER}/actions/runners/registration-token`,
    method: 'POST',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });

  env.GITEA_RUNNER_REGISTRATION_TOKEN = runnersToken.token;
  return env;
};

const createPersonalAccessToken = async (env) => {
  const token = await giteaApi({
    path: `/api/v1/users/${env.GITEA_ADMIN_USER}/tokens`,
    method: 'POST',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
    body: {
      name: 'GitOps Bot Token',
      scopes: ['write:repository', 'write:organization', 'write:user'],
    },
  });

  env.GITOPS_BOT_PERSONAL_ACCESS_TOKEN = token.sha1;
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

  startEverything();
  await waitFor('http://studio.localhost', 120);

  process.exit(0);
};

script()
  .then()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
