#!/usr/bin/env node
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const REPO = process.env.REPO || 'Altinn/altinn-studio';
const PORT = parseInt(process.env.PORT || '3456', 10);
const GH_PARALLEL = 16;
const PAGE_SIZE = 100;
const SYNC_MAX_PAGES_BOOTSTRAP = 100;
const SYNC_MAX_PAGES_INCREMENTAL = 100;
const SYNC_INTERVAL_MS = 60_000;
const PENDING_REFRESH_INTERVAL_MS = 10_000;
const { createGhClient } = require('./gh');
const {
  DB_PATH,
  initDb,
  getWorkflowStopAtRunId,
  setWorkflowStopAtRunId,
} = require('./db');
const { openUrlInBrowser } = require('./browser');
const { ghApi, ghApiPost, getRequestCount } = createGhClient({ parallel: GH_PARALLEL });

class FatalSyncError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FatalSyncError';
  }
}

// --- Service & environment definitions ---

function envDisplayName(name) {
  return name.replace(/^(runtime_|studio_)/, '');
}

function createEnv(name, aliases = [], ungated = false) {
  const displayName = envDisplayName(name);
  const matchTokens = new Set([name.toLowerCase(), displayName.toLowerCase(), ...aliases.map((a) => a.toLowerCase())]);
  return { name, displayName, matchTokens: [...matchTokens], ungated };
}

function createPlane(name, envs) {
  return {
    name,
    envs: [...envs],
    envNames: new Set(envs.map((env) => env.name)),
  };
}

function workflowDisplayName(workflow) {
  return workflow
    .replace(/\.ya?ml$/i, '')
    .replace(/^deploy-(runtime|studio)-/, '')
    .replace(/^deploy-/, '');
}

const RUNTIME_ENVS = Object.freeze(
  ['at_ring1', 'at_ring2', 'tt_ring1', 'tt_ring2', 'prod_ring1', 'prod_ring2']
    .map((name) => createEnv(`runtime_${name}`, [], name === 'at_ring1')),
);
const STUDIO_ENVS = Object.freeze([
  createEnv('dev', [], true),
  createEnv('staging', [], true),
  createEnv('prod', ['preapproved-prod']),
]);
const PLANE_DEFINITIONS = Object.freeze([
  { name: 'runtime', envs: RUNTIME_ENVS },
  { name: 'studio', envs: STUDIO_ENVS },
]);

function service(workflow, planeDefs) {
  return { workflow, displayName: workflowDisplayName(workflow), planes: planeDefs.map(([name, envs]) => createPlane(name, envs)) };
}

const STUDIO_WORKFLOWS = [
  'deploy-loadbalancer.yaml',
  'deploy-designer.yaml',
  'deploy-repositories.yaml',
  'deploy-gitea-runners.yaml',
  'deploy-studio-mcp-server.yaml',
  'deploy-studio-otel-operator.yaml',
  'deploy-studio-observability.yaml',
  'deploy-lhci-server.yaml',
];
const RUNTIME_SERVICE_DEFS = [
  ['deploy-runtime-gateway.yaml', RUNTIME_ENVS],
  ['deploy-runtime-operator.yaml', RUNTIME_ENVS],
  ['deploy-runtime-pdf3.yaml', RUNTIME_ENVS],
  ['deploy-runtime-observability.yaml', RUNTIME_ENVS],
  ['deploy-runtime-flux-config.yaml', RUNTIME_ENVS],
  ['deploy-runtime-grafana-manifests.yaml', RUNTIME_ENVS.slice(2)],
  ['deploy-runtime-apps-config.yaml', RUNTIME_ENVS],
];

const SERVICES = [
  service('deploy-runtime-syncroot.yaml', [['runtime', RUNTIME_ENVS]]),
  service('deploy-runtime-kubernetes-wrapper.yaml', [['runtime', RUNTIME_ENVS], ['studio', STUDIO_ENVS]]),
  ...RUNTIME_SERVICE_DEFS.map(([workflow, envs]) => service(workflow, [['runtime', envs]])),
  service('deploy-studio-syncroot.yaml', [['studio', STUDIO_ENVS]]),
  ...STUDIO_WORKFLOWS.map((workflow) => service(workflow, [['studio', STUDIO_ENVS]])),
];

const SERVICE_BY_WORKFLOW = new Map(SERVICES.map((service) => [service.workflow, service]));

// --- Environment extraction from job name ---

function getJobNameTokens(name) {
  const tokens = String(name || '').toLowerCase().match(/[a-z0-9_-]+/g);
  return new Set(tokens || []);
}

function extractEnvFromJobName(name, envs) {
  const tokens = getJobNameTokens(name);
  for (const env of envs) {
    for (const token of env.matchTokens) {
      if (tokens.has(token)) return env.name;
    }
  }
  return null;
}

function resolveServiceEnv(service, jobName) {
  for (const plane of service.planes) {
    const env = extractEnvFromJobName(jobName, plane.envs);
    if (env) return env;
  }
  return null;
}

// --- SQLite statements ---

function normalizeRunJobsForService(service, jobs) {
  const normalized = [];
  for (const job of jobs) {
    if (!Number.isInteger(job.id)) continue;
    const env = resolveServiceEnv(service, job.name);
    if (!env) continue;
    normalized.push({
      id: job.id,
      env,
      status: job.status,
      conclusion: job.conclusion ?? null,
    });
  }
  return normalized;
}

function storeRunJobs(run, jobs, workflowOverride = null) {
  const workflowFile = workflowOverride || path.posix.basename(run.path || '');
  const service = SERVICE_BY_WORKFLOW.get(workflowFile);
  if (!service) return [];

  const normalizedJobs = normalizeRunJobsForService(service, jobs);
  for (const job of normalizedJobs) {
    stmts.upsertJob.run(
      job.id, run.id, service.workflow, job.env,
      run.head_sha.slice(0, 7), run.head_sha,
      run.display_title || '', run.html_url,
      job.status, job.conclusion,
      run.created_at, run.updated_at,
    );
  }
  return normalizedJobs;
}

// --- Background sync worker ---

async function fetchRunJobs(runId) {
  try {
    const data = await ghApi(`repos/${REPO}/actions/runs/${runId}/jobs?per_page=100`);
    return { jobs: data.jobs || [], error: null };
  } catch (err) {
    console.error(`  Failed to fetch jobs for run ${runId}: ${err.message}`);
    return { jobs: [], error: err };
  }
}

function newestJobTimestamp(jobs, fallbackIso) {
  let newestIso = fallbackIso;
  let newestMs = Date.parse(fallbackIso || '');
  if (!Number.isFinite(newestMs)) newestMs = 0;

  for (const job of jobs) {
    for (const iso of [job.completed_at, job.started_at]) {
      if (!iso) continue;
      const ms = Date.parse(iso);
      if (!Number.isFinite(ms) || ms <= newestMs) continue;
      newestMs = ms;
      newestIso = iso;
    }
  }
  return newestIso || new Date().toISOString();
}

function createRunFromContext(runContext, jobs) {
  const headShaFromJobs = jobs.find((job) => typeof job.head_sha === 'string' && job.head_sha.length >= 7)?.head_sha;
  return {
    id: runContext.run_id,
    head_sha: headShaFromJobs || runContext.full_sha,
    display_title: runContext.title,
    html_url: runContext.run_url,
    created_at: runContext.run_created_at,
    updated_at: newestJobTimestamp(jobs, runContext.updated_at),
  };
}

async function refreshRunFromContext(runId) {
  const runContext = stmts.getRunContext.get(runId);
  if (!runContext) {
    console.error(`  Missing run context for run ${runId}`);
    return;
  }
  const { jobs, error } = await fetchRunJobs(runId);
  if (error) return;
  const run = createRunFromContext(runContext, jobs);
  storeRunJobs(run, jobs, runContext.workflow);
}

async function fetchWorkflowRunsPage(workflow, page) {
  const apiPath =
    `repos/${REPO}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=${PAGE_SIZE}&page=${page}`;
  const data = await ghApi(apiPath);
  return data.workflow_runs || [];
}

async function processRunForSync(run, workflow, planes, coverageByPlane = null) {
  const existingJobs = stmts.getJobs.all(run.id, workflow);
  const runCompleted = run.status === 'completed';
  const canUseJobFromDb =
    runCompleted &&
    run.conclusion === 'success' &&
    Array.isArray(existingJobs) &&
    existingJobs.length > 0;

  let jobsToProcess;
  let jobFetches = 0;
  if (canUseJobFromDb) {
    jobsToProcess = existingJobs.map((job) => ({
      env: job.env,
      status: job.job_status,
      conclusion: job.job_conclusion,
    }));
  } else {
    const { jobs, error } = await fetchRunJobs(run.id);
    if (error) {
      return { runId: run.id, jobFetches: 1, watermarkMode: 'block' };
    }
    jobsToProcess = storeRunJobs(run, jobs, workflow);
    jobFetches = 1;
  }

  if (coverageByPlane) {
    for (const plane of planes) {
      for (const job of jobsToProcess) {
        if (plane.envNames.has(job.env) && job.status === 'completed' && job.conclusion === 'success') {
          coverageByPlane.get(plane.name).add(job.env);
        }
      }
    }
  }
  // Completed runs won't gain new matrix env jobs later, so an unmapped completed run
  // should not keep the watermark pinned.
  const watermarkMode = jobsToProcess.length > 0 || runCompleted ? 'advance' : 'block';
  return { runId: run.id, jobFetches, watermarkMode };
}

async function processRunsForSync(runs, workflow, planes, coverageByPlane = null) {
  const runResults = await Promise.all(
    runs.map((run) => processRunForSync(run, workflow, planes, coverageByPlane)),
  );
  const jobFetches = runResults.reduce((sum, result) => sum + result.jobFetches, 0);
  return { runResults, jobFetches };
}

function computeSafeWatermark(stopAtRunId, runResults) {
  let smallestBlockingRunId = Number.POSITIVE_INFINITY;
  for (const result of runResults) {
    if (result.runId <= stopAtRunId || result.watermarkMode !== 'block') continue;
    if (result.runId < smallestBlockingRunId) smallestBlockingRunId = result.runId;
  }

  let nextStopAtRunId = stopAtRunId;
  for (const result of runResults) {
    if (result.runId <= stopAtRunId || result.watermarkMode !== 'advance') continue;
    if (result.runId >= smallestBlockingRunId) continue;
    if (result.runId > nextStopAtRunId) nextStopAtRunId = result.runId;
  }
  return nextStopAtRunId;
}

function getMissingCoverage(planes, coverageByPlane) {
  const missing = [];
  for (const plane of planes) {
    const covered = coverageByPlane.get(plane.name) || new Set();
    for (const env of plane.envs) {
      if (!covered.has(env.name)) missing.push(`${plane.name}/${env.name}`);
    }
  }
  return missing;
}

async function syncWorkflowBootstrap(service) {
  const { workflow, planes } = service;
  let totalRuns = 0;
  let jobFetches = 0;
  let newestWorkflowRunId = 0;
  const runResults = [];
  const coverageByPlane = new Map(planes.map((plane) => [plane.name, new Set()]));

  for (let page = 1; page <= SYNC_MAX_PAGES_BOOTSTRAP; page++) {
    const runs = await fetchWorkflowRunsPage(workflow, page);
    if (runs.length === 0) break;
    if (newestWorkflowRunId === 0 && page === 1) newestWorkflowRunId = runs[0].id;

    totalRuns += runs.length;
    const pageStats = await processRunsForSync(runs, workflow, planes, coverageByPlane);
    jobFetches += pageStats.jobFetches;
    runResults.push(...pageStats.runResults);

    const coverageComplete = planes.every((plane) => coverageByPlane.get(plane.name).size === plane.envs.length);
    if (coverageComplete) {
      const nextStopAtRunId = computeSafeWatermark(0, runResults);
      if (nextStopAtRunId > 0) setWorkflowStopAtRunId(stmts, workflow, nextStopAtRunId);
      return { totalRuns, jobFetches };
    }
  }

  const missing = getMissingCoverage(planes, coverageByPlane);
  const details = missing.length > 0 ? missing.join(', ') : 'unknown';
  throw new FatalSyncError(
    `[sync][workflow] ${workflow}: bootstrap failed within ${SYNC_MAX_PAGES_BOOTSTRAP} pages; missing env(s): ${details}`,
  );
}

async function syncWorkflowIncremental(service, stopAtRunId) {
  const { workflow, planes } = service;
  let totalRuns = 0;
  let jobFetches = 0;
  let newestWorkflowRunId = 0;
  const runResults = [];
  let reachedStopAtRunId = false;
  let exhaustedRuns = false;

  for (let page = 1; page <= SYNC_MAX_PAGES_INCREMENTAL; page++) {
    const runs = await fetchWorkflowRunsPage(workflow, page);
    if (runs.length === 0) {
      exhaustedRuns = true;
      break;
    }
    if (newestWorkflowRunId === 0 && page === 1) newestWorkflowRunId = runs[0].id;

    const relevant = [];
    for (const run of runs) {
      if (run.id <= stopAtRunId) {
        reachedStopAtRunId = true;
        break;
      }
      relevant.push(run);
    }

    totalRuns += relevant.length;
    if (relevant.length > 0) {
      const pageStats = await processRunsForSync(relevant, workflow, planes);
      jobFetches += pageStats.jobFetches;
      runResults.push(...pageStats.runResults);
    }
    if (reachedStopAtRunId) break;
  }

  if (!reachedStopAtRunId) {
    const reason = exhaustedRuns
      ? `run history exhausted before reaching watermark ${stopAtRunId}`
      : `page cap ${SYNC_MAX_PAGES_INCREMENTAL} reached before watermark ${stopAtRunId}`;
    throw new FatalSyncError(`[sync][workflow] ${workflow}: incremental failed; ${reason}`);
  }

  if (newestWorkflowRunId > stopAtRunId) {
    const nextStopAtRunId = computeSafeWatermark(stopAtRunId, runResults);
    if (nextStopAtRunId > stopAtRunId) setWorkflowStopAtRunId(stmts, workflow, nextStopAtRunId);
  }
  return { totalRuns, jobFetches };
}

async function syncRuns() {
  const workflowEntries = SERVICES.map((service) => ({
    service,
    stopAtRunId: getWorkflowStopAtRunId(stmts, service.workflow),
  }));
  console.log(
    `[sync] Config: workflows=${workflowEntries.length}, page_size=${PAGE_SIZE}, max_pages_bootstrap=${SYNC_MAX_PAGES_BOOTSTRAP}, max_pages_incremental=${SYNC_MAX_PAGES_INCREMENTAL}`,
  );

  const stats = await Promise.all(
    workflowEntries.map(({ service, stopAtRunId }) => (
      stopAtRunId
        ? syncWorkflowIncremental(service, stopAtRunId)
        : syncWorkflowBootstrap(service)
    )),
  );
  const totalRuns = stats.reduce((sum, s) => sum + s.totalRuns, 0);
  const jobFetches = stats.reduce((sum, s) => sum + s.jobFetches, 0);
  return { totalRuns, jobFetches };
}

let pendingJobsRefreshing = false;

async function refreshPendingJobs({ activeOnly = false } = {}) {
  if (pendingJobsRefreshing) {
    console.log('[pending-refresh] Already running, skipping');
    return 0;
  }
  pendingJobsRefreshing = true;
  try {
    return await _refreshPendingJobs({ activeOnly });
  } finally {
    pendingJobsRefreshing = false;
  }
}

async function _refreshPendingJobs({ activeOnly }) {
  const pendingRows = (activeOnly ? stmts.getActiveJobs : stmts.getPendingJobs).all();
  if (pendingRows.length === 0) return 0;

  const runIds = [...new Set(pendingRows.map((r) => r.run_id))];
  await Promise.all(runIds.map((runId) => refreshRunFromContext(runId)));

  // Fetch can_approve for newly-seen waiting runs — one API call per run, result cached in DB.
  const needCanApprove = stmts.getWaitingNeedingCanApprove.all();
  if (needCanApprove.length > 0) {
    const dataByRunId = new Map();
    for (const { run_id: runId, env } of needCanApprove) {
      let data = dataByRunId.get(runId);
      if (data) data.envs.add(env);
      else dataByRunId.set(runId, { envs: new Set([env]) });
    }
    await Promise.all(
      [...dataByRunId.entries()].map(async ([runId, { envs }]) => {
        try {
          const pending = await ghApi(`repos/${REPO}/actions/runs/${runId}/pending_deployments`);
          if (!Array.isArray(pending)) return;
          for (const p of pending) {
            const ghEnvName = p?.environment?.name ?? '';
            if (!envs.has(ghEnvName)) continue;
            const canApprove = p?.current_user_can_approve ? 1 : 0;
            stmts.setCanApprove.run(canApprove, runId, ghEnvName);
          }
        } catch (err) {
          console.error(`  Failed to fetch pending_deployments for run ${runId}: ${err.message}`);
        }
      }),
    );
  }

  return runIds.length;
}

let syncRunning = false;

async function syncOnce() {
  if (syncRunning) {
    console.log('[sync] Already running, skipping');
    return;
  }
  syncRunning = true;
  try {
    await _syncOnce();
  } finally {
    syncRunning = false;
  }
}

async function _syncOnce() {
  const start = Date.now();
  const syncStartRequests = getRequestCount();
  console.log('[sync] Running...');

  const { totalRuns, jobFetches } = await syncRuns();
  const pendingRefreshed = await refreshPendingJobs();
  const syncRequests = getRequestCount() - syncStartRequests;
  const requestsPerHour = Math.round((syncRequests * 3_600_000) / SYNC_INTERVAL_MS);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[sync] GH API in syncOnce: ${syncRequests} calls (~${requestsPerHour}/hour @ ${SYNC_INTERVAL_MS / 1000}s interval)`,
  );
  console.log(
    `[sync] Done in ${elapsed}s: ${totalRuns} runs processed, ${jobFetches} job fetches, ${pendingRefreshed} pending refreshed`,
  );
}

async function startWorker() {
  // Await the initial sync so its rejection is handled before loops start.
  try {
    await syncOnce();
  } catch (e) {
    console.error(`[sync] Fatal initial sync error: ${e.message}`);
    process.exit(1);
  }

  // Serialized loops: each run completes before the next is scheduled via setTimeout,
  // preventing concurrent invocations regardless of how long each run takes.
  (async () => {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL_MS));
      try {
        await syncOnce();
      } catch (e) {
        if (e instanceof FatalSyncError) {
          console.error(`[sync] Fatal integrity error: ${e.message}`);
          process.exit(1);
        }
        console.error(`[sync] Error: ${e.message}`);
      }
    }
  })();

  (async () => {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, PENDING_REFRESH_INTERVAL_MS));
      try {
        await refreshPendingJobs({ activeOnly: true });
      } catch (e) {
        console.error(`[pending-refresh] ${e.message}`);
      }
    }
  })();
}

// --- Query: build status from DB ---

function buildStatus() {
  function mapCanApprove(value) {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  const mapDeployment = (row, includeCanApprove = false) => {
    if (!row) return null;
    const deployment = {
      sha: row.sha,
      fullSha: row.full_sha,
      title: row.title,
      runUrl: row.run_url,
      runId: row.run_id,
      status: row.job_status,
      conclusion: row.job_conclusion,
      updatedAt: row.updated_at,
    };
    if (includeCanApprove) {
      deployment.canApprove = mapCanApprove(row.can_approve);
    }
    return deployment;
  };

  const services = SERVICES.map((service) => {
    const planes = service.planes.map((plane) => {
      const envs = {};
      for (const env of plane.envs) {
        const current = stmts.getCurrent.get(service.workflow, env.name) || null;
        const next = stmts.getNext.get(service.workflow, env.name, service.workflow, env.name) || null;
        envs[env.name] = {
          name: env.name,
          displayName: env.displayName,
          current: mapDeployment(current),
          next: mapDeployment(next, true),
        };
      }
      return { name: plane.name, envs };
    });
    return {
      workflow: service.workflow,
      displayName: service.displayName,
      planes,
    };
  });

  return {
    planes: PLANE_DEFINITIONS.map((plane) => ({
      name: plane.name,
      envs: plane.envs.map((env) => ({ name: env.name, displayName: env.displayName, ungated: env.ungated })),
    })),
    services,
    fetchedAt: new Date().toISOString(),
  };
}

// --- Approval ---

function serviceHasEnv(service, env) {
  return service.planes.some((plane) => plane.envNames.has(env));
}

async function approveDeployment(runId, workflow, env) {
  const pending = await ghApi(`repos/${REPO}/actions/runs/${runId}/pending_deployments`);
  if (!Array.isArray(pending)) throw new Error(`unexpected pending_deployments response for run ${runId}`);

  const service = SERVICE_BY_WORKFLOW.get(workflow);
  if (!service) throw new Error(`unknown workflow '${workflow}'`);
  if (!serviceHasEnv(service, env)) throw new Error(`env '${env}' is not configured for workflow '${workflow}'`);
  const match = pending.find((p) => (p?.environment?.name ?? '') === env);
  if (!match) throw new Error(`no pending deployment for env '${env}' in run ${runId}`);

  const envId = match.environment.id;
  if (!Number.isInteger(envId)) throw new Error(`unexpected env id ${envId} for run ${runId}`);

  await ghApiPost(`repos/${REPO}/actions/runs/${runId}/pending_deployments`, {
    environment_ids: [envId],
    state: 'approved',
    comment: 'Approved via deployer',
  });
}

function readBody(req, maxBytes = 65_536) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// --- HTTP server ---

const MIME_TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const ext = path.extname(urlPath);
  const fullPath = path.resolve(__dirname, '.' + urlPath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end();
    return;
  }

  try {
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/status' && req.method === 'GET') {
      sendJson(res, 200, buildStatus());
    } else if (req.url === '/api/refresh' && req.method === 'POST') {
      await syncOnce();
      sendJson(res, 200, buildStatus());
    } else if (req.url === '/api/approve' && req.method === 'POST') {
      const raw = await readBody(req);
      let items;
      try {
        items = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: 'invalid JSON' });
        return;
      }
      if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        sendJson(res, 400, { error: 'expected non-empty array (max 50)' });
        return;
      }
      for (const item of items) {
        if (!item || !Number.isInteger(item.runId) || item.runId <= 0) {
          sendJson(res, 400, { error: `invalid runId: ${item?.runId}` });
          return;
        }
        if (typeof item.workflow !== 'string' || !SERVICE_BY_WORKFLOW.has(item.workflow)) {
          sendJson(res, 400, { error: `invalid workflow: ${item?.workflow}` });
          return;
        }
        const service = SERVICE_BY_WORKFLOW.get(item.workflow);
        if (typeof item.env !== 'string' || !serviceHasEnv(service, item.env)) {
          sendJson(res, 400, { error: `invalid env for workflow ${item?.workflow}: ${item?.env}` });
          return;
        }
      }
      console.log(`[approve] ${items.length} item(s): ${items.map((i) => `workflow=${i.workflow} run=${i.runId} env=${i.env}`).join(', ')}`);
      const results = await Promise.all(
        items.map(async ({ runId, workflow, env }) => {
          try {
            await approveDeployment(runId, workflow, env);
            console.log(`[approve] OK workflow=${workflow} run=${runId} env=${env}`);
            return { runId, workflow, env, ok: true };
          } catch (err) {
            console.error(`[approve] FAIL workflow=${workflow} run=${runId} env=${env}: ${err.message}`);
            return { runId, workflow, env, ok: false, error: err.message };
          }
        }),
      );
      await refreshPendingJobs();
      sendJson(res, 200, { results, status: buildStatus() });
      // Follow-up refresh to catch GitHub's approval processing lag — the immediate
      // refreshPendingJobs above often reads back 'waiting' before GitHub transitions the job.
      setTimeout(
        () => refreshPendingJobs().catch((e) => console.error(`[approve-followup] ${e.message}`)),
        5_000,
      );
    } else if (!req.url.startsWith('/api/')) {
      serveStatic(req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
  } catch (err) {
    console.error(`Request error: ${err.message}`);
    sendJson(res, 500, { error: err.message });
  }
});

// --- Startup ---

const stmts = initDb(DB_PATH);

server.listen(PORT, () => {
  const deployerUrl = `http://localhost:${PORT}`;
  console.log(`Deployer: ${deployerUrl}`);
  console.log(`Repo: ${REPO}`);
  console.log(`DB: ${DB_PATH}`);
  openUrlInBrowser(deployerUrl);
  console.log('Starting worker...');
  startWorker();
});
