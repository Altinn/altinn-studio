// eslint-disable-next-line no-global-assign
require = require('esm')(module /*, options*/);
const bodyParser = require('body-parser');

const { APP_DEVELOPMENT_BASENAME, DASHBOARD_BASENAME } = require('../../constants.js');
const { ensureStorageDir } = require('./utils');
const {
  userCurrentPath,
  datamodelsPath,
  createDatamodelPath,
  remainingSessionTimePath,
  repoInitialCommitPath,
  frontendLangPath,
  repoMetaPath,
  serviceConfigPath,
  serviceNamePath,
} = require('../../shared/api-paths');
const { datamodelGetPath, datamodelPath} = require('app-shared/api-paths');

module.exports = (middlewares, devServer) => {
  if (!devServer) {
    throw new Error('webpack-dev-server is not defined');
  }
  const { app } = devServer;
  ensureStorageDir();
  app.use(bodyParser.json());

  const startUrl =
    process.env.npm_package_name === 'dashboard' ? DASHBOARD_BASENAME : `${APP_DEVELOPMENT_BASENAME}/someorg/someapp`;

  app.delete(datamodelPath(':owner', ':repo'), require('./routes/del-datamodel'));
  app.get('/', (req, res) => res.redirect(startUrl));
  app.get('/designer/:owner/:repo', require('./routes/get-index-html'));
  app.get(datamodelGetPath(':owner', ':repo', '/App/models/:filename'), require('./routes/get-datamodel'));
  app.get(datamodelsPath(':owner', ':repo'), require('./routes/get-datamodels'));
  app.get(frontendLangPath(':locale'), (req, res) => res.json(require(`../../language/src/${req.params.locale}.json`)));
  app.get(remainingSessionTimePath(), (req, res) => res.send('9999'));
  app.get(repoInitialCommitPath(':owner', ':repo'), (req, res) => res.sendStatus(204));
  app.get(repoMetaPath(':owner', ':repo'), require('./routes/get-repo-data'));
  app.get(serviceConfigPath(':owner', ':repo'), (req, res) => res.sendStatus(204));
  app.get(serviceNamePath(':owner', ':repo'), (req, res) => res.send(req.params.repo.toUpperCase()));
  app.get(userCurrentPath(), require('./routes/user-current'));
  app.post(createDatamodelPath(':owner', ':repo'), require('./routes/create-model'));
  app.put(datamodelsPath(':owner', ':repo'), require('./routes/put-datamodel'));

  return middlewares;
};
