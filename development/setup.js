const fs = require("fs");
const path = require("path");
const os = require("os");
const gitaApi = require("./utils/gitea-api.js");
const waitFor = require("./utils/wait-for.js");
const runCommand = require("./utils/run-command.js");

const randomPass = () =>
  [
    Math.random().toString(36).substring(2, 5),
    Math.random().toString(36).substring(2, 5),
  ].join("DIG@");

const defaultEnvVars = {
  DEVELOP_BACKEND: 0,
  DEVELOP_DASHBOARD: 0,
  DEVELOP_APP_DEVELOPMENT: 0,
  DEVELOP_PREVIEW: 0,
  GITEA_ADMIN_USER: "localgiteaadmin",
  GITEA_ADMIN_PASS: randomPass(),
  CYPRESS_TEST_APP: "autodeploy-v3",
  GITEA_ORG_USER: "ttd",
};

const ensureDotEnv = () => {
  const dotenvLocations = path.resolve(__dirname, "..", ".env");
  const envData = { ...defaultEnvVars };
  const existingData = fs.existsSync(dotenvLocations)
    ? fs.readFileSync(dotenvLocations, "utf-8").split(os.EOL)
    : [];
  existingData.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine[0] !== "#") {
      const [key, value] = trimmedLine.split("=");
      envData[key] = value;
    }
  });
  const newEnv = [];
  Object.keys(envData).forEach((key) =>
    newEnv.push([key, envData[key]].join("="))
  );
  fs.writeFileSync(dotenvLocations, newEnv.join(os.EOL), "utf-8");
  console.log("Done ensuring .env variables at:", dotenvLocations);
  return envData;
};

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
