// eslint-disable-next-line no-global-assign
require = require('esm')(module /*, options*/);
const bodyParser = require('body-parser');
const { ensureStorageDir, fixtureRoute } = require('./utils');

const {
  datamodelPath,
  userCurrentPath,
  datamodelsPath,
  createDatamodelPath,
  remainingSessionTimePath,
  repoInitialCommitPath,
  branchStatusPath,
  repoStatusPath,
  frontendLangPath,
  repoMetaPath,
  serviceConfigPath,
  serviceNamePath,
} = require('../../../packages/shared/src/api/paths');

module.exports = (middlewares, devServer) => {
  if (!devServer) {
    throw new Error('webpack-dev-server is not defined');
  }
  const { app } = devServer;
  ensureStorageDir();
  app.use(bodyParser.json());

  app.delete(datamodelPath(':org', ':app'), require('./routes/del-datamodel'));
  app.get('/', require('./routes/root-redirect'));
  app.get('/editor/:owner/:repo', require('./routes/get-index-html'));
  //prettier-ignore
  app.get(datamodelPath(':org', ':app', '/App/models/:filename'), require('./routes/get-datamodel'));
  app.get(datamodelsPath(':org', ':app'), require('./routes/get-datamodels'));
  //prettier-ignore
  app.get(frontendLangPath(':locale'), (req, res) => res.json(require(`../../../language/src/${req.params.locale}.json`)));
  app.get(remainingSessionTimePath(), (req, res) => res.send('9999'));
  app.get(repoInitialCommitPath(':org', ':app'), (req, res) => res.sendStatus(204));
  app.get(repoMetaPath(':org', ':app'), require('./routes/get-repo-data'));
  app.get(branchStatusPath(':org', ':app', 'branch'), require('./routes/get-branch'));
  app.get(repoStatusPath(':org', ':app'), fixtureRoute('status'));
  app.get(serviceConfigPath(':org', ':app'), (req, res) => res.sendStatus(204));
  //prettier-ignore
  app.get(serviceNamePath(':org', ':app'), (req, res) => res.send(req.params.repo.toUpperCase()));
  app.get(userCurrentPath(), require('./routes/user-current'));
  app.post(createDatamodelPath(':org', ':app'), require('./routes/create-model'));
  app.put(datamodelsPath(':org', ':app'), require('./routes/put-datamodel'));

  app.get('/designer/api/:org/:app/preview-status', require('./routes/preview-get'));
  app.get('/designer/html/preview.html', require('./routes/get-preview-html'));

  app.get('/designer/api/:org/:app/deployments', fixtureRoute('Deployments'));
  app.get('/designer/api/:org/:app/deployments/permissions', fixtureRoute('permissions'));
  app.get('/designer/api/:org/:app/releases', fixtureRoute('releases'));
  app.post('/designer/api/:org/:app/deployments', require('./routes/create-deployment'));
  app.post('/designer/api/:org/:app/releases', require('./routes/create-release'));
  return middlewares;
};
