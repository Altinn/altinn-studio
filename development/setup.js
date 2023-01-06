const gitaApi = require("./utils/gitea-api.js");
const waitFor = require("./utils/wait-for.js");
const runCommand = require("./utils/run-command.js");
const ensureDotEnv = require("./utils/ensure-dot-env.js");

const startingDockerCompose = () =>
  runCommand("docker compose up -d --remove-orphans");

const createAdminUser = (env) =>
  runCommand(
    [
      `docker exec altinn-repositories gitea admin user create`,
      `--username ${env.GITEA_ADMIN_USER}`,
      `--password ${env.GITEA_ADMIN_PASS}`,
      `--email ${env.GITEA_ADMIN_USER}@digdir.no`,
      `--admin`,
      `--must-change-password=false`,
    ].join(" ")
  );

const ensureAdminPassword = (env) =>
  runCommand(
    [
      `docker exec altinn-repositories gitea admin user change-password`,
      `--username ${env.GITEA_ADMIN_USER}`,
      `--password ${env.GITEA_ADMIN_PASS}`,
    ].join(" ")
  );

// http://studio.localhost/repos/api/swagger
const createTestDepOrg = (env) =>
  gitaApi({
    path: "/repos/api/v1/orgs",
    method: "POST",
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
    body: {
      username: env.GITEA_ORG_USER,
      full_name: "Testdepartementet",
      description: "Internt organisasjon for test av løsning",
    },
  });

const addUserToOwnersTeam = async (env) => {
  const teams = await gitaApi({
    path: `/repos/api/v1/orgs/${env.GITEA_ORG_USER}/teams`,
    method: "GET",
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
  await gitaApi({
    path: `/repos/api/v1/teams/${teams[0].id}/members/${env.GITEA_ADMIN_USER}`,
    method: "PUT",
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
};

const script = async () => {
  const currentEnv = ensureDotEnv();
  await startingDockerCompose();
  await waitFor("http://studio.localhost/repos/");
  await createAdminUser(currentEnv);
  await ensureAdminPassword(currentEnv);
  await createTestDepOrg(currentEnv);
  await addUserToOwnersTeam(currentEnv);
  process.exit(0);
};

script().then();
