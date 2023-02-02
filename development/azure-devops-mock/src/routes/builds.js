import pQueue from 'p-queue';
import { between, sleep, designerDomain } from '../utils.js';
import axios from 'axios';

const queue = new pQueue({ concurrency: 1 });
const builds = [];
const webhookUrl = designerDomain() + '/designer/api/v1/checkreleasebuildstatus';
export const buildsRoute = async (req, res) => {
  const params = JSON.parse(req.body.parameters);
  const ResourceOwner = params.APP_OWNER;
  const BuildNumber = between(10000000, 99999999);
  const buildData = {
    Id: BuildNumber,
    Status: 'notStarted',
    StartTime: new Date().toJSON(),
  };
  const azureDevOpsWebHookEventModel = {
    Resource: {
      BuildNumber,
      ResourceOwner,
    },
  };
  res.json(buildData);
  builds.push(buildData);
  await queue.add(async () => {
    await sleep(10000);
    try {
      console.log('first hit towards', webhookUrl, azureDevOpsWebHookEventModel);
      await axios.post(webhookUrl, azureDevOpsWebHookEventModel);
    } catch (e) {
      console.error(e.message);
    }
  });
  await queue.add(async () => {
    await sleep(10000);
    try {
      console.log('second hit towards', webhookUrl, azureDevOpsWebHookEventModel);
      await axios.post(webhookUrl, azureDevOpsWebHookEventModel);
    } catch (e) {
      console.error(e.message);
    }
  });
};
// http://localhost:6161/_apis/build/builds/80891942?api-version=5.1
export const buildRoute = async (req, res) => {
  const { BuildNumber } = req.params;
  const build = builds.find((b) => b.Id === parseInt(BuildNumber));
  if (build.Status === 'notStarted') {
    build.Status = 'inProgress';
    build.Result = 'none';
  }
  if (build.Status === 'inProgress') {
    build.Status = 'completed';
    build.Result = 'succeeded';
  }
  res.json(build);
};
