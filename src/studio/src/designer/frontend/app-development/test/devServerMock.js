const bodyParser = require('body-parser');

const createDatamodel = require('./fixtures/create-model');
const getDatamodel = require('./fixtures/get-datamodel');
const getDatamodels = require('./fixtures/get-datamodels');
const getIndexHtml = require('./fixtures/get-index-html');
const getLanguage = require('./fixtures/get-language.json');
const getRepoData = require('./fixtures/get-repo-data');
const putDatamodel = require('./fixtures/put-datamodel');
const delDatamodel = require('./fixtures/del-datamodel');
/**
 * Request URL: http://localhost:8080/designer/api/my-org/my-app/datamodels?modelPath=App%2Fmodels%2Fny-modell.schema.json
 */
module.exports = (middlewares, devServer) => {
  if (!devServer) {
    throw new Error('webpack-dev-server is not defined');
  }
  const { app } = devServer;
  app.use(bodyParser.json());

  app.get('/designer/api/v1/session/remaining', (req, res) => res.send('9999'));
  app.get('/designerapi/Language/GetLanguageAsJSON', (req, res) =>
    res.send(getLanguage),
  );
  app.get('/designer/:owner/:repo/Text/GetServiceName', (req, res) =>
    res.send(req.params.repo.toUpperCase()),
  );
  app.get('/designer/:owner/:repo/Config/GetServiceConfig', (req, res) =>
    res.sendStatus(204),
  );
  app.get('/designer/:owner/:repo', (req, res) => res.send(getIndexHtml()));
  app.get('/designer/api/v1/repos/:owner/:repo', (req, res) =>
    res.send(getRepoData(req.headers.host, req.params.owner, req.params.repo)),
  );
  app.get('/designer/api/v1/repos/:owner/:repo/initialcommit', (req, res) =>
    res.sendStatus(204),
  );
  app.get('/designer/api/:owner/:repo/datamodels', (req, res) =>
    res.send(getDatamodels()),
  );
  app.get(
    '/designer/api/:owner/:repo/datamodelsApp/models/:filename',
    (req, res) => {
      res.send(getDatamodel(req.params.filename));
    },
  );
  app.post('/designer/api/:owner/:repo/datamodels/post', (req, res) => {
    const { modelName } = req.body;
    res.status(201);
    res.send(createDatamodel(modelName));
  });
  app.put('/designer/api/my-org/my-app/datamodels', (req, res) => {
    const { modelPath } = req.query;
    res.status(200);
    res.send(putDatamodel(modelPath, req.body));
  });
  app.del('/designer/api/my-org/my-app/datamodels', (req, res) => {
    const { modelPath } = req.query;
    res.status(200);
    res.send(delDatamodel(modelPath));
  });
  return middlewares;
};
