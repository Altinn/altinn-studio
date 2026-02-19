#!/usr/bin/env node
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const REPO = process.env.REPO || 'Altinn/altinn-studio';
const PORT = parseInt(process.env.PORT || '3456', 10);
const CACHE_TTL_MS = 120_000;
const GH_PARALLEL = 16;
const RUNS_PER_WORKFLOW = 30;

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

// --- Semaphore ---

function createSemaphore(max) {
  let active = 0;
  const queue = [];
  return async function withPermit(fn) {
    if (active >= max) await new Promise((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      if (queue.length > 0) queue.shift()();
    }
  };
}

const withGhPermit = createSemaphore(GH_PARALLEL);

// --- gh CLI wrapper ---

function ghRaw(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`gh ${args.slice(0, 3).join(' ')} failed: ${stderr.trim().slice(0, 200)}`));
    });
    child.stdin.end();
  });
}

async function ghApi(apiPath) {
  const raw = await withGhPermit(() => ghRaw(['api', apiPath]));
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`JSON parse failed for ${apiPath}`);
  }
}

// --- Environment extraction from job name ---

function extractEnvFromJobName(jobName, plane, envs) {
  const name = jobName.toLowerCase();

  // Skip non-deployment jobs
  if (/^(get-short-sha|construct-|determine-tag|docker-|helm-|push-|db-migration)/.test(name)) {
    return null;
  }

  if (plane === 'runtime') {
    for (const env of envs) {
      // Runtime GH env names: runtime_at_ring1. Job names contain both forms.
      if (name.includes(env) || name.includes(`runtime_${env}`)) return env;
    }
  } else {
    // preapproved-prod → prod
    if (name.includes('preapproved-prod')) return 'prod';
    for (const env of envs) {
      if (name.includes(`(${env})`) || name.includes(`(${env},`) || name.includes(`(${env} `)) {
        return env;
      }
    }
  }
  return null;
}

// --- Data fetching ---

async function fetchServiceStatus(svc, plane, envs) {
  const envStatus = {};

  let runs;
  try {
    const data = await ghApi(
      `repos/${REPO}/actions/workflows/${svc.workflow}/runs?per_page=${RUNS_PER_WORKFLOW}&branch=main`,
    );
    runs = data.workflow_runs || [];
  } catch (err) {
    console.error(`Failed to fetch runs for ${svc.workflow}: ${err.message}`);
    return envStatus;
  }

  const relevant = runs.filter(
    (r) =>
      (r.status === 'completed' && r.conclusion === 'success') ||
      r.status === 'in_progress' ||
      r.status === 'waiting' ||
      r.status === 'queued',
  );

  // Classify by *job* status, not run status — a single run can have some jobs
  // completed while others are still waiting for approval.
  const currentFound = new Set();
  const nextFound = new Set();
  const envCount = envs.length;

  // Stop once we have current (deployed) for all envs.
  // Pending/next runs are always recent, so they're caught in early batches.
  function allCurrentFound() {
    return currentFound.size >= envCount;
  }

  function processJobs(run, jobs) {
    for (const job of jobs) {
      const env = extractEnvFromJobName(job.name, plane, envs);
      if (!env) continue;

      const entry = {
        sha: run.head_sha.slice(0, 7),
        fullSha: run.head_sha,
        title: run.display_title || '',
        runUrl: run.html_url,
        runId: run.id,
        status: job.status,
        conclusion: job.conclusion,
        updatedAt: run.updated_at,
      };

      const jobDone = job.status === 'completed' && job.conclusion === 'success';
      const jobPending = job.status === 'queued' || job.status === 'waiting' || job.status === 'in_progress';

      if (jobDone && !currentFound.has(env)) {
        if (!envStatus[env]) envStatus[env] = {};
        envStatus[env].current = entry;
        currentFound.add(env);
      } else if (jobPending && !nextFound.has(env)) {
        if (!envStatus[env]) envStatus[env] = {};
        envStatus[env].next = entry;
        nextFound.add(env);
      }
    }
  }

  // Fetch jobs in batches of 4, stop early once all envs are covered
  const BATCH_SIZE = 4;
  for (let i = 0; i < relevant.length && !allCurrentFound(); i += BATCH_SIZE) {
    const batch = relevant.slice(i, i + BATCH_SIZE);
    const jobResults = await Promise.all(
      batch.map(async (run) => {
        try {
          const data = await ghApi(`repos/${REPO}/actions/runs/${run.id}/jobs?per_page=100`);
          return { run, jobs: data.jobs || [] };
        } catch (err) {
          console.error(`Failed to fetch jobs for run ${run.id}: ${err.message}`);
          return { run, jobs: [] };
        }
      }),
    );
    for (const { run, jobs } of jobResults) {
      processJobs(run, jobs);
    }
  }

  return envStatus;
}

async function fetchAllStatus() {
  const start = Date.now();

  const allServices = [
    ...RUNTIME_SERVICES.map((s) => ({ ...s, plane: 'runtime', envs: RUNTIME_ENVS })),
    ...STUDIO_SERVICES.map((s) => ({ ...s, plane: 'studio', envs: STUDIO_ENVS })),
  ];

  const results = await Promise.all(
    allServices.map(async (svc) => {
      const envStatus = await fetchServiceStatus(svc, svc.plane, svc.envs);
      return { plane: svc.plane, name: svc.name, envStatus };
    }),
  );

  const runtime = {};
  const studio = {};
  for (const { plane, name, envStatus } of results) {
    (plane === 'runtime' ? runtime : studio)[name] = envStatus;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Fetched status in ${elapsed}s`);

  return { runtime, studio, fetchedAt: new Date().toISOString() };
}

// --- Cache ---

let cache = { data: null, timestamp: 0 };

async function getStatus(forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }
  const data = await fetchAllStatus();
  cache = { data, timestamp: Date.now() };
  return data;
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
      const data = await getStatus(false);
      sendJson(res, 200, data);
    } else if (req.url === '/api/refresh' && req.method === 'POST') {
      const data = await getStatus(true);
      sendJson(res, 200, data);
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

server.listen(PORT, () => {
  console.log(`Deployer: http://localhost:${PORT}`);
  console.log(`Repo: ${REPO}`);
});
