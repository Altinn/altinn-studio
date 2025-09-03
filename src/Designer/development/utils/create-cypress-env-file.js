const giteaApi = require('./gitea-api');
const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = async (env) => {
  const tokenPrefix = 'setup.js';

  const allTokens = await giteaApi({
    path: `/api/v1/users/${env.GITEA_ADMIN_USER}/tokens`,
    method: 'GET',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
  });
  const deleteTokenOperations = [];
  allTokens.forEach((token) => {
    if (token.name.startsWith(tokenPrefix)) {
      deleteTokenOperations.push(
        giteaApi({
          path: `/api/v1/users/${env.GITEA_ADMIN_USER}/tokens/${token.id}`,
          method: 'DELETE',
          user: env.GITEA_ADMIN_USER,
          pass: env.GITEA_ADMIN_PASS,
        }),
      );
    }
  });
  const result = await giteaApi({
    path: `/api/v1/users/${env.GITEA_ADMIN_USER}/tokens`,
    method: 'POST',
    user: env.GITEA_ADMIN_USER,
    pass: env.GITEA_ADMIN_PASS,
    body: {
      name: tokenPrefix + ' ' + Date.now(),
      scopes: [
        'write:activitypub',
        'write:admin',
        'write:issue',
        'write:misc',
        'write:notification',
        'write:organization',
        'write:package',
        'write:repository',
        'write:user',
      ],
    },
  });
  const envFile = {
    adminUser: env.GITEA_ADMIN_USER,
    adminPwd: env.GITEA_ADMIN_PASS,
    accessToken: result.sha1,
    useCaseUser: env.GITEA_ADMIN_USER,
    useCaseUserPwd: env.GITEA_ADMIN_PASS,
    autoTestUser: env.GITEA_CYPRESS_USER,
    autoTestUserPwd: env.GITEA_CYPRESS_PASS,
  };

  await Promise.all(deleteTokenOperations);
  const cypressEnvFilePath = path.resolve(
    __dirname,
    '..',
    '..',
    'frontend',
    'testing',
    'cypress',
    'cypress.env.json',
  );
  fs.writeFileSync(cypressEnvFilePath, JSON.stringify(envFile, null, 2) + os.EOL, 'utf-8');
  console.log('Wrote a new:', cypressEnvFilePath);
};
