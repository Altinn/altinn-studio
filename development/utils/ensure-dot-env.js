const path = require('path');
const fs = require('fs');
const os = require('os');
const getCommit = require('./git-commit-hash');
const writeEnvFile = require('./write-env-file');
const randomPass = () =>
  [Math.random().toString(36).substring(2, 5), Math.random().toString(36).substring(2, 5)]
    .join('DIG@')
    .concat(Math.floor(Math.random() * 10).toString());

const defaultEnvVars = {
  CYPRESS_TEST_APP: 'autodeploy-v3',
  DEVELOP_APP_DEVELOPMENT: 0,
  DEVELOP_RESOURCE_ADMIN: 0,
  DEVELOP_ADMIN_FRONTEND: 0,
  DEVELOP_BACKEND: 0,
  DEVELOP_DASHBOARD: 0,
  DEVELOP_PREVIEW: 0,
  DEVELOP_STUDIO_ROOT: 0,
  GITEA_ADMIN_PASS: randomPass(),
  GITEA_ADMIN_USER: 'localgiteaadmin',
  GITEA_CYPRESS_USER: 'cypress_testuser',
  GITEA_CYPRESS_PASS: randomPass(),
  GITEA_ORG_USER: 'ttd',
  POSTGRES_PASSWORD: randomPass(),
  CLIENT_ID: '',
  CLIENT_SECRET: '',
};

module.exports = () => {
  const dotenvLocations = path.resolve(__dirname, '..', '..', '.env');
  const envData = { ...defaultEnvVars };
  const existingData = fs.existsSync(dotenvLocations)
    ? fs.readFileSync(dotenvLocations, 'utf-8').split(os.EOL)
    : [];

  existingData.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine[0] !== '#') {
      const [key, value] = trimmedLine.split('=');
      envData[key] = value;
    }
  });
  // Commit should always be latest and be overwritten
  envData['COMMIT'] = getCommit();
  writeEnvFile(envData);
  return envData;
};
