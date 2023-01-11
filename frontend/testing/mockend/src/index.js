// eslint-disable-next-line no-global-assign
require = require('esm')(module /*, options*/);
const bodyParser = require('body-parser');
const { ensureStorageDir, fixtureRoute } = require('./utils');

const {
  datamodelGetPath,
  datamodelPath,
  userCurrentPath,
  datamodelsPath,
  createDatamodelPath,
  remainingSessionTimePath,
  repoInitialCommitPath,
  frontendLangPath,
  repoMetaPath,
  serviceConfigPath,
  serviceNamePath,
} = require('../../../packages/shared/src/api-paths');

module.exports = (middlewares, devServer) => {
  if (!devServer) {
    throw new Error('webpack-dev-server is not defined');
  }
  const { app } = devServer;
  ensureStorageDir();
  app.use(bodyParser.json());

  app.delete(datamodelPath(':owner', ':repo'), require('./routes/del-datamodel'));
  app.get('/', require('./routes/root-redirect'));
  app.get('/editor/:owner/:repo', require('./routes/get-index-html'));
  //prettier-ignore
  app.get(datamodelGetPath(':owner', ':repo', '/App/models/:filename'), require('./routes/get-datamodel'));
  app.get(datamodelsPath(':owner', ':repo'), require('./routes/get-datamodels'));
  //prettier-ignore
  app.get(frontendLangPath(':locale'), (req, res) => res.json(require(`../../../language/src/${req.params.locale}.json`)));
  app.get(remainingSessionTimePath(), (req, res) => res.send('9999'));
  app.get(repoInitialCommitPath(':owner', ':repo'), (req, res) => res.sendStatus(204));
  app.get(repoMetaPath(':owner', ':repo'), require('./routes/get-repo-data'));
  app.get(serviceConfigPath(':owner', ':repo'), (req, res) => res.sendStatus(204));
  //prettier-ignore
  app.get(serviceNamePath(':owner', ':repo'), (req, res) => res.send(req.params.repo.toUpperCase()));
  app.get(userCurrentPath(), require('./routes/user-current'));
  app.post(createDatamodelPath(':owner', ':repo'), require('./routes/create-model'));
  app.put(datamodelsPath(':owner', ':repo'), require('./routes/put-datamodel'));

  app.get('/designer/api/:org/:app/preview-status', require('./routes/preview-get'));
  app.get('/designer/html/preview.html', require('./routes/get-preview-html'));

  app.get('/designer/api/v1/:org/:app/Deployments', fixtureRoute('Deployments'));
  app.get('/designer/api/v1/:org/:app/deployments/permissions', fixtureRoute('permissions'));
  app.get('/designer/api/v1/:org/:app/releases', fixtureRoute('releases'));
  app.get('/designer/api/v1/repos/:org/:app/branches/branch', require('./routes/get-branch'));
  app.get('/designer/api/v1/repos/:org/:app/status', fixtureRoute('status'));
  app.post('/designer/api/v1/:org/:app/Deployments', require('./routes/create-deployment'));
  app.post('/designer/api/v1/:org/:app/releases', require('./routes/create-release'));
  return middlewares;
};
