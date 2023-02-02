import express from 'express';
import { buildRoute, buildsRoute } from './routes/builds.js';

const app = express();
const port = 6161;

app.use(express.json());

app.get('/', (req, res) => res.send('Azure Devops API Mock'));
app.get('/_apis/build/builds/', buildsRoute);
app.get('/_apis/build/builds/:BuildNumber', buildRoute);
app.post('/_apis/build/builds/', buildsRoute);

app.listen(port, () => console.log(`Azure Devops API Mock listening on port ${port}`));
