const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const http = require("http");

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
};

const runCommand = (command) => {
  console.log("Running command:", command);
  try {
    execSync(command, {
      cwd: path.resolve(__dirname, ".."),
    });
  } catch (e) {
    console.error(`Error: ${e.stdout}`);
  }
};

const ensureDotEnv = () => {
  const dotenvLocations = path.resolve(__dirname, "..", ".env");
  const envData = { ...defaultEnvVars };
  if (fs.existsSync(dotenvLocations)) {
    const existingData = fs.readFileSync(dotenvLocations, "utf-8");
    existingData.split(os.EOL).forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0 && trimmedLine[0] !== "#") {
        const [key, value] = trimmedLine.split("=");
        envData[key] = value;
      }
    });
  }
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
  new Promise(function (resolve, reject) {
    const postBody = {
      username: "ttd",
      full_name: "Testdepartementet",
      description: "Internt organisasjon for test av løsning",
    };
    const req = http.request(
      {
        host: "studio.localhost",
        path: "/repos/api/v1/orgs",
        auth: [env.GITEA_ADMIN_USER, env.GITEA_ADMIN_PASS].join(":"),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (response) => {
        const data = [];
        response.on("data", (chunk) => data.push(chunk));
        response.on("end", () => {
          console.log(data.join());
          resolve(data.join());
        });
      }
    );
    req.write(JSON.stringify(postBody));
    req.end(() => {});
  });

const checkIfGiteaIsUp = () => {
  const url = "http://studio.localhost/repos/";
  return new Promise(function (resolve, reject) {
    let attemts = 0;
    const intervalId = setInterval(function () {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            console.log(url, " is up!");
            clearInterval(intervalId);
            resolve();
          } else {
            console.log("Waiting for:", url);
          }
          if (attemts > 5) {
            clearInterval(intervalId);
            console.log("Giving up: ", url);
            reject("Giving up this");
          }
          attemts++;
        })
        .end();
    }, 1000);
  });
};

const script = async () => {
  const currentEnv = ensureDotEnv();
  await startingDockerCompose();
  await checkIfGiteaIsUp();
  await createAdminUser(currentEnv);
  await ensureAdminPassword(currentEnv);
  await createTestDepOrg(currentEnv);
  process.exit(0);
};

script().then();
