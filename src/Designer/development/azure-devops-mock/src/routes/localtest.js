/**
 * Bridge to the studioctl environment on the host, so the admin app in the compose stack shows
 * a real local workflow engine and real local instances instead of canned data.
 *
 * `studioctl env up` fronts every component with one ingress on the host (port 8000 by default)
 * and routes by host name: `local.altinn.cloud` is localtest itself (the platform, Storage
 * included) and `workflow-engine.local.altinn.cloud` is the engine — a container, or a host
 * process under `--dev-workflow-engine`; this bridge does not care which. From inside the compose
 * network the ingress is `host.docker.internal:8000`, so every request here goes there with the
 * component's host name in the `Host` header.
 *
 * The workflow routes play the runtime gateway's role: the same route shape Designer calls in a
 * real environment, translated to the engine's `{org}/{app}` namespace, with the same
 * "engine unavailable" problem when nothing answers — so an environment without a running
 * studioctl stack reads exactly like an environment without an engine.
 *
 * Requests go through axios rather than `fetch`: Node's fetch silently drops a `Host` header,
 * and the header is the whole point here.
 */
import axios from 'axios';

/** Any status is an answer to pass on; only a connection failure is an error. */
const passThrough = { validateStatus: () => true, maxRedirects: 0 };

const localtestUrl = () =>
  (process.env.LOCALTEST_URL ?? 'http://host.docker.internal:8000').replace(/\/$/, '');
const platformHost = () => process.env.LOCALTEST_PLATFORM_HOST ?? 'local.altinn.cloud';
const workflowEngineHost = () =>
  process.env.LOCALTEST_WORKFLOW_ENGINE_HOST ?? 'workflow-engine.local.altinn.cloud';

/** Whether the Storage instance routes read the studioctl environment instead of random data. */
export const instancesFromLocaltest = () =>
  ['1', 'true'].includes((process.env.INSTANCES_FROM_LOCALTEST ?? '').toLowerCase());

// ---- Workflow engine, in the runtime gateway's clothes -------------------------------------------

const WORKFLOW_ENGINE_UNAVAILABLE_TYPE = 'urn:altinn:studio:gateway:workflow-engine-unavailable';

/**
 * Forwards one whitelisted workflow route to the local engine. `suffix` is the path after the
 * engine namespace, with the route parameters already applied.
 */
const forwardToWorkflowEngine = (suffix) => async (req, res) => {
  const { org, app } = req.params;
  const engineNamespace = encodeURIComponent(`${org.toLowerCase()}/${app}`);
  const search = new URL(req.originalUrl, 'http://mock').search;
  const url = `${localtestUrl()}/api/v1/${engineNamespace}${suffix(req.params)}${search}`;
  // A JSON body (the fail verb's reason) travels as it came; everything else sends none.
  const body = req.is('json') && req.body && Object.keys(req.body).length ? req.body : undefined;

  let upstream;
  try {
    upstream = await axios.request({
      ...passThrough,
      method: req.method,
      url,
      headers: {
        Host: workflowEngineHost(),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      data: body,
      responseType: 'arraybuffer',
    });
  } catch (error) {
    console.warn(`workflow engine unreachable at ${url}: ${error.message}`);
    res
      .status(502)
      .type('application/problem+json')
      .send({
        type: WORKFLOW_ENGINE_UNAVAILABLE_TYPE,
        title: 'Workflow engine unavailable',
        status: 502,
        detail: `No workflow engine answered at ${localtestUrl()} (Host: ${workflowEngineHost()}). Is \`studioctl env up\` running?`,
      });
    return;
  }

  // The body passes through untouched, status code included, as it does through the gateway.
  res.status(upstream.status);
  const contentType = upstream.headers['content-type'];
  if (contentType) {
    res.type(contentType);
  }
  res.send(Buffer.from(upstream.data));
};

export const workflowCollectionsRoute = forwardToWorkflowEngine(() => '/collections');
export const workflowCollectionRoute = forwardToWorkflowEngine(
  ({ key }) => `/collections/${encodeURIComponent(key)}`,
);
export const workflowsRoute = forwardToWorkflowEngine(() => '/workflows');
export const workflowRoute = forwardToWorkflowEngine(
  ({ workflowId }) => `/workflows/${encodeURIComponent(workflowId)}`,
);
export const workflowResumeRoute = forwardToWorkflowEngine(
  ({ workflowId }) => `/workflows/${encodeURIComponent(workflowId)}/resume`,
);
export const workflowAbandonRoute = forwardToWorkflowEngine(
  ({ workflowId }) => `/workflows/${encodeURIComponent(workflowId)}/abandon`,
);
export const workflowNudgeRoute = forwardToWorkflowEngine(
  ({ workflowId }) => `/workflows/${encodeURIComponent(workflowId)}/nudge`,
);
export const workflowFailRoute = forwardToWorkflowEngine(
  ({ workflowId }) => `/workflows/${encodeURIComponent(workflowId)}/fail`,
);

// ---- Storage instances, from localtest -----------------------------------------------------------

const orgTokens = new Map();

/** A localtest service-owner token for `org`, with the instance read scope localtest defaults to. */
async function orgToken(org) {
  if (!orgTokens.has(org)) {
    const response = await axios.get(
      `${localtestUrl()}/Home/GetTestOrgToken/${encodeURIComponent(org)}`,
      { ...passThrough, headers: { Host: platformHost() }, responseType: 'text' },
    );
    if (response.status !== 200) {
      throw new Error(`localtest refused an org token for ${org}: ${response.status}`);
    }
    orgTokens.set(org, response.data);
  }
  return orgTokens.get(org);
}

/** A Storage call as the org; `ok` is a 2xx answer, `data` the parsed body. */
async function storageRequest(org, path, method = 'GET') {
  const token = await orgToken(org);
  const response = await axios.request({
    ...passThrough,
    method,
    url: `${localtestUrl()}${path}`,
    headers: { Host: platformHost(), Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  return { ...response, ok: response.status >= 200 && response.status < 300 };
}

/** Storage's `next` is a full link; Designer only wants the token it carries. */
function continuationTokenOf(nextLink) {
  if (!nextLink) {
    return null;
  }
  try {
    return new URL(nextLink, 'http://localtest').searchParams.get('continuationToken');
  } catch {
    return null;
  }
}

const guidOf = (instanceId) => instanceId.slice(instanceId.lastIndexOf('/') + 1);

/**
 * The shape Storage's Studio endpoint reports: a flat instance with bare-GUID id. Timestamps are
 * taken from the same places that endpoint reads them.
 */
function toSimpleInstance(instance) {
  const [org, app] = (instance.appId ?? `${instance.org}/`).split('/');
  const readStatus = instance.status?.readStatus;
  return {
    id: guidOf(instance.id),
    org: instance.org ?? org,
    app,
    isRead: readStatus !== undefined && readStatus !== 0 && readStatus !== 'Unread',
    currentTaskId: instance.process?.currentTask?.elementId ?? null,
    currentTaskName: instance.process?.currentTask?.name ?? null,
    completedAt: instance.process?.ended ?? null,
    archivedAt: instance.status?.archived ?? null,
    softDeletedAt: instance.status?.softDeleted ?? null,
    hardDeletedAt: instance.status?.hardDeleted ?? null,
    confirmedAt: instance.completeConfirmations?.[0]?.confirmedOn ?? null,
    createdAt: instance.created ?? null,
    lastChangedAt: instance.lastChanged ?? null,
  };
}

function toSimpleDataElement(element) {
  return {
    id: element.id,
    dataType: element.dataType,
    contentType: element.contentType,
    size: element.size ?? 0,
    locked: Boolean(element.locked),
    isRead: element.isRead ?? true,
    fileScanResult: element.fileScanResult ?? 'NotApplicable',
    hardDeletedAt: element.deleteStatus?.hardDeleted ?? null,
    createdAt: element.created ?? null,
    lastChangedAt: element.lastChanged ?? null,
  };
}

/** The query Designer sends is Storage's own vocabulary, so it is forwarded as it came. */
const FORWARDED_QUERY_PARAMS = [
  'size',
  'continuationToken',
  'process.currentTask',
  'process.isComplete',
  'status.isArchived',
  'status.isSoftDeleted',
  'status.isHardDeleted',
  'confirmed',
  'created',
];

/**
 * The apps the studioctl environment knows for `org`, shaped like the mock's own deployment rows,
 * so they appear in the admin app's list without a mock deploy first. Nothing when localtest is
 * not reachable: the list then holds only what was deployed through local Studio.
 */
export async function localtestDeployments(org, env, origin) {
  if (!instancesFromLocaltest()) {
    return [];
  }
  try {
    const response = await storageRequest(
      org,
      `/storage/api/v1/applications/${encodeURIComponent(org)}`,
    );
    if (!response.ok) {
      return [];
    }
    return (response.data.applications ?? []).map((application) => ({
      org,
      env,
      app: application.id.slice(application.id.indexOf('/') + 1),
      sourceEnvironment: origin,
      buildId: 'localtest',
      imageTag: 'localtest',
    }));
  } catch (error) {
    console.warn(`localtest unreachable at ${localtestUrl()}: ${error.message}`);
    return [];
  }
}

export const localtestInstancesRoute = async (req, res) => {
  const { org, app } = req.params;
  const query = new URLSearchParams({ appId: `${org}/${app}` });
  for (const name of FORWARDED_QUERY_PARAMS) {
    for (const value of [].concat(req.query[name] ?? [])) {
      query.append(name, value);
    }
  }

  try {
    const response = await storageRequest(org, `/storage/api/v1/instances?${query}`);
    if (!response.ok) {
      res.status(response.status).send(response.data);
      return;
    }
    const page = response.data;
    // Storage has no archive-reference filter of its own; the reference is the tail of the GUID.
    const archiveReference = req.query['archiveReference']?.toLowerCase();
    const instances = (page.instances ?? [])
      .map(toSimpleInstance)
      .filter(
        (i) =>
          !archiveReference || i.id === archiveReference || i.id.slice(24) === archiveReference,
      );
    res.json({ count: instances.length, next: continuationTokenOf(page.next), instances });
  } catch (error) {
    localtestUnavailable(res, error);
  }
};

/**
 * Storage addresses an instance by party and GUID, while the admin app only carries the GUID, so
 * the instance is found by walking the app's list — small enough locally to be no concern.
 */
async function findInstance(org, app, instanceGuid) {
  let continuationToken = null;
  do {
    const query = new URLSearchParams({ appId: `${org}/${app}`, size: '100' });
    if (continuationToken) {
      query.set('continuationToken', continuationToken);
    }
    const response = await storageRequest(org, `/storage/api/v1/instances?${query}`);
    if (!response.ok) {
      throw new Error(`localtest instance query failed: ${response.status}`);
    }
    const page = response.data;
    const match = (page.instances ?? []).find((i) => guidOf(i.id) === instanceGuid);
    if (match) {
      return match;
    }
    continuationToken = continuationTokenOf(page.next);
  } while (continuationToken);
  return null;
}

export const localtestInstanceDetailsRoute = async (req, res) => {
  const { org, app, instanceId } = req.params;
  try {
    const instance = await findInstance(org, app, guidOf(instanceId));
    if (!instance) {
      res.sendStatus(404);
      return;
    }
    res.json({
      ...toSimpleInstance(instance),
      data: (instance.data ?? []).map(toSimpleDataElement),
    });
  } catch (error) {
    localtestUnavailable(res, error);
  }
};

export const localtestInstanceDeleteRoute = async (req, res) => {
  const { org, app, instanceId } = req.params;
  try {
    const instance = await findInstance(org, app, guidOf(instanceId));
    if (!instance) {
      res.sendStatus(404);
      return;
    }
    const response = await storageRequest(
      org,
      `/storage/api/v1/instances/${instance.id}`,
      'DELETE',
    );
    res.sendStatus(response.ok ? 204 : response.status);
  } catch (error) {
    localtestUnavailable(res, error);
  }
};

function localtestUnavailable(res, error) {
  console.warn(`localtest unreachable at ${localtestUrl()}: ${error.message}`);
  res
    .status(503)
    .send(`localtest is not reachable at ${localtestUrl()}. Is \`studioctl env up\` running?`);
}
