import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import {
  buildRoute,
  buildsRoute,
  kubernetesWrapperRoute,
  runtimeGatewayDeploymentsRoute,
  runtimeGatewayDeploymentDetailsRoute,
} from './routes/builds.js';
import { authenticationRoute } from './routes/authentication.js';
import {
  storageApplicationMetadataRoute,
  storageTextsRoute,
  storageInstancesRoute,
  storageInstanceDetailsRoute,
  storageInstanceDeleteRoute,
} from './routes/storage.js';
import { environmentsRoute } from './routes/environments.js';
import { appMetadataRoute, appProcessRoute } from './routes/apps.js';
import { notificationRoute } from './routes/notifications.js';
import { accessibleForAllScopesRoute, accessScopesRoute } from './routes/maskinporten.js';
import {
  instancesFromLocaltest,
  localtestInstanceDeleteRoute,
  localtestInstanceDetailsRoute,
  localtestInstancesRoute,
  workflowAbandonRoute,
  workflowCollectionRoute,
  workflowCollectionsRoute,
  workflowResumeRoute,
  workflowRoute,
  workflowsRoute,
} from './routes/localtest.js';

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/', (req, res) => res.send('Azure Devops API Mock'));
app.get('/_apis/build/builds/', buildsRoute);
app.get('/_apis/build/builds/:BuildNumber', buildRoute);
app.get('/authentication/api/v1/exchange/:service', authenticationRoute);
app.get('/environments.json', environmentsRoute);
app.get('/apps/:org/:env/kuberneteswrapper/api/v1/deployments', kubernetesWrapperRoute);
app.get(
  '/apps/:org/:env/runtime/gateway/api/v1/deploy/origin/:origin/apps',
  runtimeGatewayDeploymentsRoute,
);
app.get(
  '/apps/:org/:env/runtime/gateway/api/v1/deploy/apps/:app/:origin',
  runtimeGatewayDeploymentDetailsRoute,
);
app.get('/apps/:org/:env/:org/:app/api/v1/applicationmetadata', appMetadataRoute);
app.get('/apps/:org/:env/:org/:app/api/v1/meta/process', appProcessRoute);
app.get('/storage/api/v1/applications/:org/:app', storageApplicationMetadataRoute);
app.get('/storage/api/v1/applications/:org/:app/texts/:lang', storageTextsRoute);
// The admin app's instance views: random data by default, or the instances the studioctl
// environment on the host actually holds (INSTANCES_FROM_LOCALTEST=true).
const useLocaltest = instancesFromLocaltest();
app.get(
  '/storage/api/v1/studio/instances/:org/:app',
  useLocaltest ? localtestInstancesRoute : storageInstancesRoute,
);
app.get(
  '/storage/api/v1/studio/instances/:org/:app/:instanceId',
  useLocaltest ? localtestInstanceDetailsRoute : storageInstanceDetailsRoute,
);
app.delete(
  '/storage/api/v1/studio/instances/:org/:app/:instanceId',
  useLocaltest ? localtestInstanceDeleteRoute : storageInstanceDeleteRoute,
);
// The runtime gateway's workflow pass-through, served by the studioctl environment's engine.
const workflowsBase = '/apps/:org/:env/runtime/gateway/api/v1/workflows/apps/:app';
app.get(`${workflowsBase}/collections`, workflowCollectionsRoute);
app.get(`${workflowsBase}/collections/:key`, workflowCollectionRoute);
app.get(`${workflowsBase}/workflows`, workflowsRoute);
app.get(`${workflowsBase}/workflows/:workflowId`, workflowRoute);
app.post(`${workflowsBase}/workflows/:workflowId/resume`, workflowResumeRoute);
app.post(`${workflowsBase}/workflows/:workflowId/abandon`, workflowAbandonRoute);
app.get('/api/v1/scopes/all', accessibleForAllScopesRoute);
app.get('/api/v1/scopes/access/all', accessScopesRoute);
app.post('/_apis/build/builds/', buildsRoute);
app.post('/notifications/api/v1/future/orders', notificationRoute);

app.all('/{*splat}', function (req, res) {
  console.log(req.method + ' ' + req.originalUrl);
  res.send('Ok, you are at the foxy mockzy');
});
const port = process.env.PORT ?? 6161;
app.listen(port, () => console.log(`Azure Devops API Mock listening on port ${port}`));
