const http = require('http');
const uuid = require('uuid/v4');
const { default: Routes } = require('@zeit/cosmosdb-server/lib/routes');
const { default: Account } = require('@zeit/cosmosdb-server/lib/account');
const {createDatabase} = require('./initialize-db');
const {createCollection} = require('./initialize-colls');
const {createRelease} = require('./create-release');

const COSMOS_DB_PORT = 8081;
const ACCOUNT = new Account();
const DATABASE_NAME = 'app-release-deployment';
const RELEASE_COLLECITON_NAME = 'releases';
const DEPLOYMENTS_COLLECTION_NAME = 'deployments';

http.createServer((req, res) => {
  console.log(req.url);
  const route = Routes(req);
  (async () => {
    let body;
    if (route) {
      const [params, handler] = route;
      try {
        body = await handler(ACCOUNT, req, res, params);
      } catch (err) {
        console.error(err);
        body = { Message: err.message };
        res.statusCode = 500;
      }
    } else {
      res.statusCode = 400;
    }

    res.setHeader("content-type", "application/json");
    res.setHeader(
      "content-location",
      `https://${req.headers.host}${req.url}`
    );
    res.setHeader("connection", "close");
    res.setHeader("x-ms-activity-id", uuid());
    res.setHeader("x-ms-request-charge", "1");
    if (req.headers["x-ms-documentdb-populatequerymetrics"]) {
      res.setHeader(
        "x-ms-documentdb-query-metrics",
        "totalExecutionTimeInMs=0.00;queryCompileTimeInMs=0.00;queryLogicalPlanBuildTimeInMs=0.00;queryPhysicalPlanBuildTimeInMs=0.00;queryOptimizationTimeInMs=0.00;VMExecutionTimeInMs=0.00;indexLookupTimeInMs=0.00;documentLoadTimeInMs=0.00;systemFunctionExecuteTimeInMs=0.00;userFunctionExecuteTimeInMs=0.00;retrievedDocumentCount=0;retrievedDocumentSize=0;outputDocumentCount=1;outputDocumentSize=0;writeOutputTimeInMs=0.00;indexUtilizationRatio=0.00"
      );
    }
    // console.log(res.statusCode, body);
    res.end(JSON.stringify(body));
  })().catch(err => {
    console.error(err);
    if (!res.finished) {
      res.statusCode = 500;
      res.end("");
    }
  });
}).listen(COSMOS_DB_PORT);

createDatabase(DATABASE_NAME).then(() => {
  createCollection(DATABASE_NAME, RELEASE_COLLECITON_NAME).catch(console.error);
  createCollection(DATABASE_NAME, DEPLOYMENTS_COLLECTION_NAME).catch(console.error);
}).catch(console.error);

