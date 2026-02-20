#!/usr/bin/env node
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const REPO = process.env.REPO || 'Altinn/altinn-studio';
const PORT = parseInt(process.env.PORT || '3456', 10);
const GH_PARALLEL = 16;
const PAGE_SIZE = 100;
const SYNC_MAX_PAGES = 10;
const EXPECTED_ENVS_DISCOVERY_RUNS = 2;
const SYNC_INTERVAL_MS = 60_000;
const { createGhClient } = require('./gh');
const {
  DB_PATH,
  initDb,
  prepareStatements,
  getWorkflowStopAtRunId,
  setWorkflowStopAtRunId,
} = require('./db');
const { openUrlInBrowser } = require('./browser');
const { ghApi, getRequestCount } = createGhClient({ parallel: GH_PARALLEL });

// --- Service & environment definitions ---

const RUNTIME_ENVS = ['at_ring1', 'at_ring2', 'tt_ring1', 'tt_ring2', 'prod_ring1', 'prod_ring2'];
const STUDIO_ENVS = ['dev', 'staging', 'prod'];

const RUNTIME_SERVICES = [
  { name: 'gateway', workflow: 'deploy-runtime-gateway.yaml' },
  { name: 'operator', workflow: 'deploy-runtime-operator.yaml' },
  { name: 'flux-config', workflow: 'deploy-runtime-flux-config.yaml' },
  { name: 'syncroot', workflow: 'deploy-runtime-syncroot.yaml' },
  { name: 'observability', workflow: 'deploy-runtime-observability.yaml' },
  { name: 'pdf3', workflow: 'deploy-runtime-pdf3.yaml' },
  { name: 'grafana-manifests', workflow: 'deploy-runtime-grafana-manifests.yaml' },
  { name: 'kubernetes-wrapper', workflow: 'deploy-runtime-kubernetes-wrapper.yaml' },
  { name: 'apps-config', workflow: 'deploy-runtime-apps-config.yaml' },
];

const STUDIO_SERVICES = [
  { name: 'designer', workflow: 'deploy-designer.yaml' },
  { name: 'repositories', workflow: 'deploy-repositories.yaml' },
  { name: 'loadbalancer', workflow: 'deploy-loadbalancer.yaml' },
  { name: 'syncroot', workflow: 'deploy-studio-syncroot.yaml' },
  { name: 'observability', workflow: 'deploy-studio-observability.yaml' },
  { name: 'otel-operator', workflow: 'deploy-studio-otel-operator.yaml' },
  { name: 'mcp-server', workflow: 'deploy-studio-mcp-server.yaml' },
  { name: 'gitea-runners', workflow: 'deploy-gitea-runners.yaml' },
  { name: 'lhci-server', workflow: 'deploy-lhci-server.yaml' },
];

const ALL_SERVICES = [
  ...RUNTIME_SERVICES.map((s) => ({ ...s, plane: 'runtime', envs: s.envs || RUNTIME_ENVS })),
  ...STUDIO_SERVICES.map((s) => ({ ...s, plane: 'studio', envs: s.envs || STUDIO_ENVS })),
];

// Lookup: workflow filename → service definition
const SVC_BY_WORKFLOW = new Map(ALL_SERVICES.map((s) => [s.workflow, s]));

// --- Environment extraction from job name ---

function extractEnvFromJobName(jobName, plane, envs) {
  const name = jobName.toLowerCase();

  // Skip non-deployment jobs
  if (/^(get-short-sha|construct-|determine-tag|docker-|helm-|push-|db-migration)/.test(name)) {
    return null;
  }

  if (plane === 'runtime') {
    for (const env of envs) {
      if (name.includes(env) || name.includes(`runtime_${env}`)) return env;
    }
  } else {
    if (name.includes('preapproved-prod')) return 'prod';
    for (const env of envs) {
      if (name.includes(`(${env})`) || name.includes(`(${env},`) || name.includes(`(${env} `)) {
        return env;
      }
    }
  }
  return null;
}

// --- SQLite statements ---

let stmts;

function storeRunJobs(run, jobs, workflowOverride = null) {
  const workflowFile = workflowOverride || path.posix.basename(run.path || '');
  const svc = SVC_BY_WORKFLOW.get(workflowFile);
  if (!svc) return false;

  let stored = 0;
  for (const job of jobs) {
    const env = extractEnvFromJobName(job.name, svc.plane, svc.envs);
    if (!env) continue;
    stmts.upsertJob.run(
      job.id, run.id, svc.workflow, env,
      run.head_sha.slice(0, 7), run.head_sha,
      run.display_title || '', run.html_url,
      job.status, job.conclusion ?? null,
      run.created_at, run.updated_at,
    );
    stored++;
  }
  return stored > 0;
}

// --- Background sync worker ---

async function fetchRunJobs(runId) {
  try {
    const data = await ghApi(`repos/${REPO}/actions/runs/${runId}/jobs?per_page=100`);
    return data.jobs || [];
  } catch (err) {
    console.error(`  Failed to fetch jobs for run ${runId}: ${err.message}`);
    return [];
  }
}

// Coverage tracker: for each workflow, track which envs we've seen
// and which have a successful deployment.
function createCoverageTracker(services) {
  // workflow → { expected: Set, seen: Set, covered: Set }
  const map = new Map(
    services.map((svc) => [
      svc.workflow,
      {
        expected: new Set(svc.envs),
        seen: new Set(),
        covered: new Set(),
      },
    ]),
  );

  function get(workflow) {
    let entry = map.get(workflow);
    if (!entry) {
      entry = {
        expected: new Set(),
        seen: new Set(),
        covered: new Set(),
      };
      map.set(workflow, entry);
    }
    return entry;
  }

  function getMissingEnvs(workflow) {
    const { expected, covered } = get(workflow);
    return [...expected].filter((env) => !covered.has(env));
  }

  return {
    recordJob(workflow, env, jobStatus, jobConclusion) {
      const e = get(workflow);
      e.seen.add(env);
      if (jobStatus === 'completed' && jobConclusion === 'success') {
        e.covered.add(env);
      }
    },
    setExpectedEnvs(workflow, envs) {
      const e = get(workflow);
      if (envs.size > 0) e.expected = new Set(envs);
    },
    getMissingEnvs,
    summary() {
      const lines = [];
      for (const [wf, { seen, covered }] of map) {
        if (seen.size === 0) continue;
        const missing = getMissingEnvs(wf);
        lines.push(
          `  ${wf}: ${seen.size} envs seen, ${covered.size} covered` +
            (missing.length > 0 ? ` (missing: ${missing.join(', ')})` : ''),
        );
      }
      return lines.join('\n');
    },
  };
}

async function processWorkflowRunsPage({ workflow, runs, stopAtRunId, coverage, skipFailedCompleted }) {
  const svc = SVC_BY_WORKFLOW.get(workflow);
  if (!svc) return { reachedStopAtRunId: false, relevantRuns: 0, jobFetches: 0, discoveredEnvs: new Set() };
  let reachedStopAtRunId = false;
  const relevant = [];
  for (const run of runs) {
    // Incremental: stop when we hit a run we've already seen
    if (stopAtRunId && run.id <= stopAtRunId) {
      reachedStopAtRunId = true;
      break;
    }

    // Skip failed/cancelled runs during backfill (no useful deployment data)
    if (skipFailedCompleted && run.status === 'completed' && run.conclusion !== 'success') continue;

    relevant.push(run);
  }

  // Fetch jobs for relevant runs in parallel (throttled), skipping known successful runs already in DB.
  const jobResults = await Promise.all(
    relevant.map(async (run) => {
      const canReuseRunJobs =
        run.status === 'completed' &&
        run.conclusion === 'success' &&
        !!stmts.hasRunId.get(run.id);
      if (canReuseRunJobs) {
        return { run, jobs: null, reusedFromDb: true };
      }
      return { run, jobs: await fetchRunJobs(run.id), reusedFromDb: false };
    }),
  );

  const discoveredEnvs = new Set();
  let sampledRuns = 0;
  let jobFetches = 0;
  for (const { run, jobs, reusedFromDb } of jobResults) {
    if (!reusedFromDb) {
      jobFetches++;
      storeRunJobs(run, jobs, workflow);

      for (const job of jobs) {
        const env = extractEnvFromJobName(job.name, svc.plane, svc.envs);
        if (!env) continue;
        coverage.recordJob(svc.workflow, env, job.status, job.conclusion);
        if (sampledRuns < EXPECTED_ENVS_DISCOVERY_RUNS) discoveredEnvs.add(env);
      }
    } else {
      const coverageRows = stmts.getRunCoverageRows.all(run.id, workflow);
      if (coverageRows.length > 0) {
        for (const row of coverageRows) {
          coverage.recordJob(svc.workflow, row.env, row.job_status, row.job_conclusion);
          if (sampledRuns < EXPECTED_ENVS_DISCOVERY_RUNS) discoveredEnvs.add(row.env);
        }
      } else {
        jobFetches++;
        const fetchedJobs = await fetchRunJobs(run.id);
        storeRunJobs(run, fetchedJobs, workflow);
        for (const job of fetchedJobs) {
          const env = extractEnvFromJobName(job.name, svc.plane, svc.envs);
          if (!env) continue;
          coverage.recordJob(svc.workflow, env, job.status, job.conclusion);
          if (sampledRuns < EXPECTED_ENVS_DISCOVERY_RUNS) discoveredEnvs.add(env);
        }
      }
    }
    sampledRuns++;
  }

  return { reachedStopAtRunId, relevantRuns: relevant.length, jobFetches, discoveredEnvs };
}

async function fetchWorkflowRunPages(workflow, pageNumbers) {
  const pageResults = [];
  for (const page of pageNumbers) {
    try {
      const data = await ghApi(
        `repos/${REPO}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=${PAGE_SIZE}&page=${page}`,
      );
      pageResults.push({ page, runs: data.workflow_runs || [], error: null });
    } catch (err) {
      pageResults.push({ page, runs: [], error: err });
    }
  }
  return pageResults;
}

async function syncWorkflowRuns({ svc, stopAtRunId, coverage }) {
  const workflow = svc.workflow;
  const hasKnownRunId = !!stopAtRunId;
  const maxPages = SYNC_MAX_PAGES;
  const pageStep = 1;

  let totalRuns = 0;
  let jobFetches = 0;
  let newestWorkflowRunId = 0;
  let reachedWatermark = false;
  let exhaustedRuns = false;
  let fetchError = false;
  let stopped = false;

  for (let pageStart = 1; pageStart <= maxPages && !stopped; pageStart += pageStep) {
    const pageEnd = Math.min(maxPages, pageStart + pageStep - 1);
    const pageNumbers = [];
    for (let page = pageStart; page <= pageEnd; page++) pageNumbers.push(page);

    const pageResults = await fetchWorkflowRunPages(workflow, pageNumbers);

    for (const { page, runs, error } of pageResults) {
      if (error) {
        console.error(`  Failed to fetch workflow runs for ${workflow} page ${page}: ${error.message}`);
        fetchError = true;
        stopped = true;
        break;
      }

      if (runs.length === 0) {
        exhaustedRuns = true;
        stopped = true;
        break;
      }

      if (newestWorkflowRunId === 0 && page === 1) newestWorkflowRunId = runs[0].id;

      const pageStats = await processWorkflowRunsPage({
        workflow,
        runs,
        stopAtRunId,
        coverage,
        skipFailedCompleted: true,
      });
      totalRuns += pageStats.relevantRuns;
      jobFetches += pageStats.jobFetches;
      if (page === 1) {
        coverage.setExpectedEnvs(workflow, pageStats.discoveredEnvs);
      }

      if (pageStats.reachedStopAtRunId) {
        reachedWatermark = true;
        stopped = true;
        break;
      }

      if (coverage.getMissingEnvs(workflow).length === 0) {
        reachedWatermark = true;
        stopped = true;
        break;
      }
    }
  }

  if (!fetchError && newestWorkflowRunId > 0) {
    const prevId = stopAtRunId || 0;
    const canAdvance = !hasKnownRunId || reachedWatermark || exhaustedRuns;
    if (canAdvance && newestWorkflowRunId > prevId) {
      setWorkflowStopAtRunId(stmts, workflow, newestWorkflowRunId);
    } else if (!canAdvance && newestWorkflowRunId > prevId) {
      console.log(
        `[sync][workflow] ${workflow}: catch-up incomplete after ${maxPages} pages, watermark unchanged at ${prevId}`,
      );
    }
  }

  return { totalRuns, jobFetches };
}

async function syncRuns() {
  const workflowStates = ALL_SERVICES.map((svc) => ({
    svc,
    stopAtRunId: getWorkflowStopAtRunId(stmts, svc.workflow),
  }));
  const coverage = createCoverageTracker(ALL_SERVICES);
  console.log(
    `[sync] Config: workflows=${workflowStates.length}, page_size=${PAGE_SIZE}, max_pages=${SYNC_MAX_PAGES}, expected_env_discovery_runs=${EXPECTED_ENVS_DISCOVERY_RUNS}`,
  );

  const stats = await Promise.all(
    workflowStates.map(({ svc, stopAtRunId }) => syncWorkflowRuns({ svc, stopAtRunId, coverage })),
  );
  const totalRuns = stats.reduce((sum, s) => sum + s.totalRuns, 0);
  const jobFetches = stats.reduce((sum, s) => sum + s.jobFetches, 0);

  return { totalRuns, jobFetches, coverage };
}

async function refreshPendingJobs() {
  const pendingRows = stmts.getPendingJobs.all();
  if (pendingRows.length === 0) return 0;

  const runIds = pendingRows.map((r) => r.run_id);

  const results = await Promise.all(
    runIds.map(async (runId) => {
      try {
        const [jobData, runData] = await Promise.all([
          ghApi(`repos/${REPO}/actions/runs/${runId}/jobs?per_page=100`),
          ghApi(`repos/${REPO}/actions/runs/${runId}`),
        ]);
        return { run: runData, jobs: jobData.jobs || [] };
      } catch (err) {
        console.error(`  Failed to refresh run ${runId}: ${err.message}`);
        return null;
      }
    }),
  );

  for (const result of results) {
    if (result) storeRunJobs(result.run, result.jobs);
  }

  return runIds.length;
}

async function syncOnce() {
  const start = Date.now();
  const syncStartRequests = getRequestCount();
  console.log('[sync] Running...');

  const { totalRuns, jobFetches, coverage } = await syncRuns();
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
  if (coverage) {
    const coverageSummary = coverage.summary();
    if (coverageSummary) console.log(coverageSummary);
  }
}

function startWorker() {
  syncOnce().then(() => {
    setInterval(() => syncOnce().catch((e) => console.error(`[sync] Error: ${e.message}`)), SYNC_INTERVAL_MS);
  });
}

// --- Query: build status from DB ---

function buildStatus() {
  const runtime = {};
  const studio = {};

  for (const svc of ALL_SERVICES) {
    const envStatus = {};

    for (const env of svc.envs) {
      const current = stmts.getCurrent.get(svc.workflow, env) || null;
      const next = stmts.getNext.get(svc.workflow, env) || null;
      if (current || next) {
        envStatus[env] = {};
        if (current) {
          envStatus[env].current = {
            sha: current.sha,
            fullSha: current.full_sha,
            title: current.title,
            runUrl: current.run_url,
            runId: current.run_id,
            status: current.job_status,
            conclusion: current.job_conclusion,
            updatedAt: current.updated_at,
          };
        }
        if (next) {
          envStatus[env].next = {
            sha: next.sha,
            fullSha: next.full_sha,
            title: next.title,
            runUrl: next.run_url,
            runId: next.run_id,
            status: next.job_status,
            conclusion: next.job_conclusion,
            updatedAt: next.updated_at,
          };
        }
      }
    }

    (svc.plane === 'runtime' ? runtime : studio)[svc.name] = envStatus;
  }

  return { runtime, studio, fetchedAt: new Date().toISOString() };
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

initDb();
stmts = prepareStatements();

server.listen(PORT, () => {
  const deployerUrl = `http://localhost:${PORT}`;
  console.log(`Deployer: ${deployerUrl}`);
  console.log(`Repo: ${REPO}`);
  console.log(`DB: ${DB_PATH}`);
  openUrlInBrowser(deployerUrl);
  console.log('Starting worker...');
  startWorker();
});
