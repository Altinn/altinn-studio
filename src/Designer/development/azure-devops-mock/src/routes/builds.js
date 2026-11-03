import pQueue from 'p-queue';
import { between, sleep, designerDomain } from '../utils.js';
import axios from 'axios';
import { localtestDeployments } from './localtest.js';

const queue = new pQueue({ concurrency: 1 });
const builds = [];
let deploys = [];
export const buildsRoute = async (req, res) => {
  const params = JSON.parse(req.body.parameters);
  // The GitOps manager definition is shared by deploy, undeploy and sync-root requests.
  const isDeploy = params.DEPLOYMENT_ID !== undefined;
  const webhookUrl =
    designerDomain() +
    '/designer/api/v1/' +
    (isDeploy ? 'checkdeploymentbuildstatus' : 'checkreleasebuildstatus');

  const ResourceOwner = params.APP_OWNER;
  const BuildNumber = between(10000000, 99999999);

  if (isDeploy) {
    deploys = [
      ...deploys.filter(
        (d) =>
          !(
            d.app === params.APP_REPO &&
            d.org === params.APP_OWNER &&
            d.envName === params.APP_ENVIRONMENT &&
            d.tagName === params.TAGNAME
          ),
      ),
      {
        app: params.APP_REPO,
        org: params.APP_OWNER,
        envName: params.APP_ENVIRONMENT,
        tagName: params.TAGNAME,
        buildNumber: BuildNumber,
        deploymentId: params.DEPLOYMENT_ID,
        sourceEnvironment: studioEnvironment(params.ALTINN_STUDIO_HOSTNAME),
        time: new Date(),
      },
    ];
  }
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
      await axios.post(webhookUrl, azureDevOpsWebHookEventModel);
    } catch (e) {
      console.error(e.message, webhookUrl);
    }
  });

  await queue.add(async () => {
    await sleep(10000);
    try {
      await axios.post(webhookUrl, azureDevOpsWebHookEventModel);
    } catch (e) {
      console.error(e.message, webhookUrl);
    }
  });
};
// http://localhost:6161/_apis/build/builds/80891942?api-version=5.1
export const buildRoute = async (req, res) => {
  const { BuildNumber } = req.params;
  const build = builds.find((b) => b.Id === parseInt(BuildNumber)) || {};
  if (build.Status === 'notStarted') {
    build.Status = 'inProgress';
    build.Result = 'none';
  }
  if (build.Status === 'inProgress') {
    build.Status = 'completed';
    build.Result = 'succeeded';
    build.finishTime = new Date().toJSON();
  }
  res.json(build);
};

/** Every app deployed through local Studio, plus the apps the studioctl environment holds. */
async function deploymentsFor(org, env, origin) {
  const deployed = deploys
    .filter((deploy) => deploy.org === org && deploy.envName === env)
    .map((deploy) => ({
      org: deploy.org,
      env: deploy.envName,
      app: deploy.app,
      sourceEnvironment: origin,
      buildId: deploy.buildNumber.toString(),
      imageTag: deploy.tagName,
    }));
  const deployedApps = new Set(deployed.map((deployment) => deployment.app));
  const fromLocaltest = (await localtestDeployments(org, env, origin)).filter(
    (deployment) => !deployedApps.has(deployment.app),
  );
  return [...deployed, ...fromLocaltest];
}

export const runtimeGatewayDeploymentsRoute = async (req, res) => {
  const { org, env, origin } = req.params;

  res.json(await deploymentsFor(org, env, origin));
};

export const runtimeGatewayDeploymentDetailsRoute = async (req, res) => {
  const { org, env, app, origin } = req.params;

  const deployment = (await deploymentsFor(org, env, origin)).find(
    (candidate) => candidate.app === app,
  );

  if (!deployment) {
    res.sendStatus(404);
    return;
  }

  res.json(deployment);
};

/** What the deploy pipeline sets STUDIO_ENVIRONMENT to, with Designer's fallback for local hosts. */
function studioEnvironment(studioHostname = '') {
  if (studioHostname.startsWith('dev.')) return 'dev';
  if (studioHostname.startsWith('staging.')) return 'staging';
  return 'prod';
}

/** The app's latest deploy through local Studio is what runs in the environment. */
// A restart in the cluster replaces the app's pods. The mock keeps the app updating for a while instead.
const RESTART_DURATION_MS = 10_000;
const restarts = new Map();

const findRunningDeploy = ({ org, env, app }) =>
  deploys.findLast(
    (candidate) => candidate.org === org && candidate.envName === env && candidate.app === app,
  );

const runningApp = (params, deploy) => {
  const restart = restarts.get(`${params.org}/${params.env}/${params.app}`);
  const updating = restart !== undefined && Date.now() < restart.until;
  return {
    release: `${params.org}-${params.app}`,
    imageTag: deploy.tagName,
    buildId: deploy.buildNumber.toString(),
    sourceEnvironment: deploy.sourceEnvironment,
    deploymentId: deploy.deploymentId,
    status: updating ? 'updating' : 'ready',
    restartedAt: restart?.restartedAt ?? null,
  };
};

export const runtimeGatewayRunningAppRoute = (req, res) => {
  const deploy = findRunningDeploy(req.params);
  if (!deploy) {
    res.sendStatus(404);
    return;
  }

  res.json(runningApp(req.params, deploy));
};

export const runtimeGatewayRestartAppRoute = (req, res) => {
  const deploy = findRunningDeploy(req.params);
  if (!deploy) {
    res.sendStatus(404);
    return;
  }

  if (runningApp(req.params, deploy).status === 'updating') {
    res.status(409).json({
      type: 'urn:altinn:studio:gateway:app-updating',
      title: 'App is updating',
      status: 409,
    });
    return;
  }

  const now = Date.now();
  restarts.set(`${req.params.org}/${req.params.env}/${req.params.app}`, {
    restartedAt: new Date(now).toISOString(),
    until: now + RESTART_DURATION_MS,
  });
  res.status(202).json(runningApp(req.params, deploy));
};
