import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { buildRoute, buildsRoute } from './routes/builds.js';
import { kubernetesWrapperRoute } from './routes/kubernetes-wrapper.js';
import { authenticationExchange } from './routes/authentication-exchange.js';

const environments = fs.readFileSync('environments.json', 'utf-8');
const app = express();
const port = 6161;
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Azure Devops API Mock'));
app.get('/_apis/build/builds/', buildsRoute);
app.get('/_apis/build/builds/:BuildNumber', buildRoute);
app.get('/authentication/api/v1/exchange/:service', authenticationExchange);
app.get('/environments.json', (req, res) => res.json(JSON.parse(environments)));
app.get('/kuberneteswrapper/api/v1/deployments', kubernetesWrapperRoute);
app.post('/_apis/build/builds/', buildsRoute);

app.all('*', function (req, res) {
  console.log(req.method + ' ' + req.originalUrl);
  res.send('Ok, you are at the foxy mockzy');
});
app.listen(port, () => console.log(`Azure Devops API Mock listening on port ${port}`));
