const bodyParser = require('body-parser');

const createDatamodel = require('./routes/create-model');
const getDatamodel = require('./routes/get-datamodel');
const getDatamodels = require('./routes/get-datamodels');
const getIndexHtml = require('./routes/get-index-html');
const getRepoData = require('./routes/get-repo-data');
const putDatamodel = require('./routes/put-datamodel');
const delDatamodel = require('./routes/del-datamodel');
const { APP_DEVELOPMENT_BASENAME } = require('../../constants.js');
/**
 * Request URL: http://localhost:8080/designer/api/my-org/my-app/datamodels?modelPath=App%2Fmodels%2Fny-modell.schema.json
 */
module.exports = (middlewares, devServer) => {
  if (!devServer) {
    throw new Error('webpack-dev-server is not defined');
  }
  const { app } = devServer;
  app.use(bodyParser.json());

  app.get('/', (req, res) => res.redirect(APP_DEVELOPMENT_BASENAME + '/someorg/someapp'));
  app.get('/designer/:owner/:repo', (req, res) => res.send(getIndexHtml()));
  app.get('/designer/:owner/:repo/Config/GetServiceConfig', (req, res) => res.sendStatus(204));
  app.get('/designer/:owner/:repo/Text/GetServiceName', (req, res) => res.send(req.params.repo.toUpperCase()));
  app.get('/designer/api/:owner/:repo/datamodels', (req, res) => res.json(getDatamodels()));
  app.get('/designer/api/:owner/:repo/datamodelsApp/models/:filename', (req, res) =>
    res.json(getDatamodel(req.params.filename)),
  );
  app.get('/designer/frontend/lang/:file', (req, res) => res.json(require(`../../language/src/${req.params.file}`)));
  app.get('/designer/api/v1/repos/:owner/:repo', (req, res) =>
    res.json(getRepoData(req.headers.host, req.params.owner, req.params.repo)),
  );
  app.get('/designer/api/v1/repos/:owner/:repo/initialcommit', (req, res) => res.sendStatus(204));
  app.get('/designer/api/v1/session/remaining', (req, res) => res.send('9999'));
  app.post('/designer/api/:owner/:repo/datamodels/post', (req, res) => {
    const { modelName } = req.body;
    res.status(201);
    res.json(createDatamodel(modelName));
  });
  app.put('/designer/api/:owner/:repo/datamodels', (req, res) => {
    const { modelPath } = req.query;
    res.status(200);
    res.json(putDatamodel(modelPath, req.body));
  });
  app.del('/designer/api/:owner/:repo/datamodels', (req, res) => {
    const { modelPath } = req.query;
    res.status(200);
    res.json(delDatamodel(modelPath));
  });
  return middlewares;
};
