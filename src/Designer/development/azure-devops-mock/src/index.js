import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { buildRoute, buildsRoute, kubernetesWrapperRoute } from './routes/builds.js';
import { authenticationRoute } from './routes/authentication.js';
import { storageApplicationMetadataRoute, storageTextsRoute } from './routes/storage.js';
import { environmentsRoute } from './routes/environments.js';
import { appProcessRoute } from './routes/apps.js';

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
app.get('/apps/:org/:env/:org/:app/api/v1/meta/process', appProcessRoute);
app.get('/storage/api/v1/applications/:org/:app', storageApplicationMetadataRoute);
app.get('/storage/api/v1/applications/:org/:app/texts/:lang', storageTextsRoute);
app.post('/_apis/build/builds/', buildsRoute);

app.all('*', function (req, res) {
  console.log(req.method + ' ' + req.originalUrl);
  res.send('Ok, you are at the foxy mockzy');
});
const port = 6161;
app.listen(port, () => console.log(`Azure Devops API Mock listening on port ${port}`));
