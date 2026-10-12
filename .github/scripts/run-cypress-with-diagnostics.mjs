// Run outside Percy and Cypress so their event loops cannot block the watchdog.
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Worker } from 'node:worker_threads';

const execFileAsync = promisify(execFile);
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Usage: node run-cypress-with-diagnostics.mjs <command> [args...]');

function positiveSetting(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

const outputDir = path.resolve(
  process.env.CYPRESS_DIAGNOSTICS_DIR || 'test/logs/cypress-diagnostics',
);
const startedAt = Date.now();
const timeoutMs = positiveSetting('CYPRESS_RUN_TIMEOUT_MS', 85 * 60_000);
const deadline = Math.min(
  startedAt + timeoutMs,
  positiveSetting('CYPRESS_JOB_DEADLINE_MS', startedAt + timeoutMs),
);
const stallMs = positiveSetting('CYPRESS_STALL_TIMEOUT_MS', 15 * 60_000);
const intervalMs = positiveSetting('CYPRESS_DIAGNOSTICS_INTERVAL_MS', 30_000);
// Percy allows 30 seconds to drain after SIGTERM, followed by a hard-exit timer.
const graceMs = positiveSetting('CYPRESS_TERMINATION_GRACE_MS', 45_000);
mkdirSync(outputDir, { recursive: true });

const state = {
  startedAt,
  deadline,
  stallMs,
  lastProgressAt: startedAt,
  lastOutputAt: null,
  node: null,
  browser: null,
  events: [],
};
let dirty = true;
let child;
let stopping;
let snapshotNumber = 0;
let captureInProgress;
let lastSavedAt = 0;

function saveState() {
  writeFileSync(
    path.join(outputDir, 'state.json.tmp'),
    JSON.stringify({ capturedAt: Date.now(), ...state }, null, 2),
  );
  renameSync(path.join(outputDir, 'state.json.tmp'), path.join(outputDir, 'state.json'));
  dirty = false;
  lastSavedAt = Date.now();
}

function record(event) {
  const receivedAt = Date.now();
  if (event.source === 'node') {
    state.node = { ...event, receivedAt };
    if (event.event === 'before:browser:launch') state.browserLaunch = state.node;
    state.lastProgressAt = receivedAt;
  } else if (event.source === 'browser') {
    // A responsive browser can still be stuck on one command. Heartbeats must
    // not reset the progress deadline. A new spec can restart its sequence.
    if (event.spec !== state.browser?.spec || event.sequence !== state.browser?.sequence) {
      state.lastProgressAt = receivedAt;
    }
    state.browser = { ...event, receivedAt };
  } else {
    return;
  }
  if (event.event !== 'heartbeat') {
    state.events.push({ ...event, receivedAt });
    if (state.events.length > 100) state.events.shift();
  }
  dirty = true;
}

// A direct HTTP side channel does not enqueue cy.task() behind the hung command.
// The random path restricts writes to the processes launched by this wrapper.
const endpointPath = `/${randomUUID()}`;
const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (request.url !== endpointPath) return response.writeHead(404).end();
  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (request.method !== 'POST') return response.writeHead(405).end();
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 32_768) return response.writeHead(413).end();
    }
    record(JSON.parse(body));
    response.writeHead(204).end();
  } catch {
    response.writeHead(400).end();
  }
});
server.requestTimeout = 5000;
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

async function browserPageDiagnostics(webSocketDebuggerUrl, screenshotName) {
  return new Promise((resolve) => {
    // Terminating the worker also closes its sockets. A frozen browser cannot
    // strand the collector in an unfinished WebSocket close handshake.
    const worker = new Worker(new URL('./probe-cypress-browser.mjs', import.meta.url), {
      workerData: webSocketDebuggerUrl,
    });
    let finished = false;
    let evidence = {};
    let screenshot;
    let screenshotSaveError;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      void worker.terminate().then(() => resolve({ ...result, screenshot, screenshotSaveError }));
    };
    const timer = setTimeout(() => finish({ ...evidence, captureTimedOut: true }), 8000);
    worker.on('message', (message) => {
      if (message.kind === 'screenshot') {
        try {
          writeFileSync(path.join(outputDir, screenshotName), Buffer.from(message.data, 'base64'));
          screenshot = screenshotName;
        } catch {
          screenshotSaveError = 'Could not save screenshot';
        }
      } else {
        evidence = message.diagnostics;
        if (message.kind === 'finished') finish(evidence);
      }
    });
    worker.on('error', () => finish({ ...evidence, workerError: 'CDP worker failed' }));
    worker.on('exit', () => finish({ ...evidence, workerExited: true }));
  });
}

async function browserDiagnostics(processes) {
  const ports = new Set();
  // Keep Cypress's launch port even after later spec events replace state.node.
  // /proc discovery alone can miss the browser on a runner.
  const launchPort = Number(state.browserLaunch?.debuggerPort);
  if (launchPort > 0 && launchPort <= 65535) ports.add(launchPort);
  const discoveryErrors = [];
  const groups = new Set(state.processGroups || [child?.pid]);
  for (const line of processes.split('\n')) {
    const fields = line.trim().split(/\s+/);
    if (!groups.has(Number(fields[2]))) continue;
    if (!/chrome|chromium|Cypress/.test(fields.at(-1))) continue;
    try {
      // Read only the debugger port. Never retain command arguments or tokens.
      const argv = (await readFile(`/proc/${fields[0]}/cmdline`, 'utf8')).split('\0');
      const port = Number(
        argv.find((arg) => arg.startsWith('--remote-debugging-port='))?.split('=')[1],
      );
      if (port > 0 && port <= 65535) ports.add(port);
    } catch (error) {
      discoveryErrors.push({ pid: Number(fields[0]), code: error.code });
    }
  }
  const browsers = await Promise.all(
    [...ports].slice(0, 2).map(async (port) => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
          signal: AbortSignal.timeout(2000),
        });
        const targets = await response.json();
        const targetsToProbe = targets
          .filter((target) => ['page', 'iframe'].includes(target.type))
          .slice(0, 4);
        const pages = [];
        // Limit worker count on runners that are already short of threads.
        for (let offset = 0; offset < targetsToProbe.length; offset += 2) {
          pages.push(
            ...(await Promise.all(
              targetsToProbe.slice(offset, offset + 2).map(async (target, index) => {
                let url = '';
                try {
                  const parsed = new URL(target.url || 'about:blank');
                  // Drop query strings and fragments, which can contain credentials.
                  url = /^https?:$/.test(parsed.protocol)
                    ? `${parsed.origin}${parsed.pathname}`
                    : parsed.protocol;
                } catch {
                  /* An invalid target URL must not suppress its other evidence. */
                }
                try {
                  return {
                    url,
                    ...(await browserPageDiagnostics(
                      target.webSocketDebuggerUrl,
                      `browser-${port}-${offset + index}.png`,
                    )),
                  };
                } catch {
                  return { url, probeError: 'Could not start browser probe' };
                }
              }),
            )),
          );
        }
        return { port, debuggerResponsive: true, pages };
      } catch {
        return { port, debuggerResponsive: false };
      }
    }),
  );
  return { browsers, discoveryErrors, launchPort: launchPort || null };
}

async function serviceHealth() {
  const urls = ['http://127.0.0.1:8080/', 'http://local.altinn.cloud:8000/'];
  const spec = state.atStop?.browser?.spec || state.atStop?.node?.spec;
  const app = spec && path.basename(path.dirname(spec));
  if (app && /^[a-z0-9-]+$/.test(app))
    urls.push(`http://local.altinn.cloud:8000/ttd/${app}/api/v1/applicationmetadata`);
  return Promise.all(
    urls.map(async (url) => {
      const started = Date.now();
      try {
        const response = await fetch(url, {
          redirect: 'manual',
          signal: AbortSignal.timeout(2000),
        });
        void response.body?.cancel().catch(() => {});
        return { url, status: response.status, firstByteMs: Date.now() - started };
      } catch (error) {
        return { url, firstByteMs: Date.now() - started, error: error.name };
      }
    }),
  );
}

async function capture(reason) {
  // Serialize snapshots so shutdown waits for any bounded capture already running.
  if (captureInProgress) await captureInProgress;
  captureInProgress = (async () => {
    saveState();
    const snapshot = {
      capturedAt: Date.now(),
      reason,
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      cypress: structuredClone({
        node: state.node,
        browser: state.browser,
        lastProgressAt: state.lastProgressAt,
      }),
    };
    try {
      const { stdout: processes } = await execFileAsync(
        'ps',
        ['-eo', 'pid,ppid,pgid,nlwp,pcpu,rss,stat,etimes,time,comm', '--sort=-pcpu'],
        { timeout: 5000, maxBuffer: 2 * 1024 * 1024 },
      );
      snapshot.processes = processes;
      // Chromium can launch in a detached group. Remember descendant groups
      // before signaling their parents, since exiting parents reparent children.
      const rows = processes
        .split('\n')
        .slice(1)
        .map((line) => line.trim().split(/\s+/).slice(0, 3).map(Number));
      const descendants = new Set([child?.pid]);
      let previousSize;
      do {
        previousSize = descendants.size;
        for (const [pid, parent] of rows) {
          if (descendants.has(parent)) descendants.add(pid);
        }
      } while (descendants.size !== previousSize);
      state.processGroups = [
        ...new Set(rows.filter(([pid]) => descendants.has(pid)).map(([, , group]) => group)),
      ];
      const { stdout: threads } = await execFileAsync(
        'ps',
        ['-eLo', 'pid,ppid,lwp,psr,pcpu,stat,time,comm', '--sort=-pcpu'],
        { timeout: 5000, maxBuffer: 2 * 1024 * 1024 },
      );
      snapshot.threads = threads;
    } catch (error) {
      snapshot.captureError = error.message;
    }
    snapshot.cgroup = {};
    snapshot.cgroupErrors = {};
    for (const name of [
      'cpu.max',
      'cpu.stat',
      'memory.current',
      'memory.max',
      'memory.events',
      'pids.current',
      'pids.max',
      'pids.events',
    ]) {
      try {
        snapshot.cgroup[name] = await readFile(`/sys/fs/cgroup/${name}`, 'utf8');
      } catch (error) {
        snapshot.cgroupErrors[name] = error.code;
      }
    }
    if (reason === 'before-stop') {
      // Probe services before any debugger pause can affect the browser.
      snapshot.services = await serviceHealth();
      try {
        const { stdout } = await execFileAsync(
          'ps',
          ['-eLo', 'pid,ppid,lwp,psr,pcpu,stat,time,wchan:32,comm', '--sort=-pcpu'],
          { timeout: 5000, maxBuffer: 2 * 1024 * 1024 },
        );
        snapshot.threadWaits = stdout;
      } catch (error) {
        snapshot.waitCaptureError = error.code || error.message;
      }
      for (const [key, filename] of [
        ['processLimits', '/proc/self/limits'],
        ['cgroupMembership', '/proc/self/cgroup'],
      ]) {
        try {
          snapshot[key] = await readFile(filename, 'utf8');
        } catch (error) {
          snapshot[`${key}Error`] = error.code;
        }
      }
      try {
        const { stdout } = await execFileAsync('ss', ['-antp'], {
          timeout: 2000,
          maxBuffer: 2 * 1024 * 1024,
        });
        snapshot.sockets = stdout;
      } catch (error) {
        snapshot.socketCaptureError = error.code || error.message;
      }
      // A failed ps must not prevent the independent launch-port probe.
      // Browser probes run only after deciding to stop, and preserve partial
      // evidence when one of the bounded requests cannot complete.
      snapshot.browserDiagnostics = await browserDiagnostics(snapshot.processes || '');
    }
    // Retain the last hour at the default interval, plus the shutdown snapshot.
    const filename =
      reason === 'periodic' ? `sample-${snapshotNumber++ % 120}.json` : `${reason}.json`;
    writeFileSync(path.join(outputDir, filename), JSON.stringify(snapshot, null, 2));
  })();
  try {
    await captureInProgress;
  } finally {
    captureInProgress = null;
  }
}

function signalGroup(signal) {
  if (!child?.pid) return;
  for (const group of new Set([child.pid, ...(state.processGroups || [])])) {
    try {
      process.kill(-group, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}

function stop(reason, exitCode = 124) {
  if (stopping) return stopping;
  state.stopReason = reason;
  state.exitCode = exitCode;
  // Shutdown can emit failed-test events and clear the pending command. Freeze
  // the state that triggered the watchdog before any test process is signaled.
  state.atStop = structuredClone({
    capturedAt: Date.now(),
    node: state.node,
    browser: state.browser,
    lastProgressAt: state.lastProgressAt,
  });
  saveState();
  console.error(
    `Cypress diagnostics: ${reason}. Saving evidence before stopping the test processes.`,
  );
  stopping = (async () => {
    await capture('before-stop');
    signalGroup('SIGTERM');
    // Always escalate, even if Percy exits before a stuck descendant does.
    await new Promise((resolve) => setTimeout(resolve, graceMs));
    signalGroup('SIGKILL');
  })();
  return stopping;
}

process.on('SIGTERM', () => void stop('wrapper received SIGTERM', 143));
process.on('SIGINT', () => void stop('wrapper received SIGINT', 130));

if (Date.now() >= deadline) {
  state.stopReason = 'job cleanup deadline reached during setup';
  state.exitCode = 124;
  saveState();
  server.close();
  process.exitCode = 124;
} else {
  child = spawn(command, args, {
    detached: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CYPRESS_DIAGNOSTICS_URL: `http://127.0.0.1:${server.address().port}${endpointPath}`,
    },
  });
  state.childPid = child.pid;
  for (const [stream, output] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (data) => {
      state.lastOutputAt = Date.now();
      dirty = true;
      output.write(data);
    });
  }
  const completion = new Promise((resolve) => {
    child.once('error', (error) => {
      state.launchError = error.message;
      resolve(1);
    });
    child.once('close', (code, signal) => {
      if (signal) state.signal = signal;
      const signalNumber = signal && os.constants.signals[signal];
      resolve(code ?? (signalNumber ? 128 + signalNumber : 1));
    });
  });
  saveState();
  await capture('started');
  const watchdog = setInterval(() => {
    if (dirty && Date.now() - lastSavedAt >= 5000) saveState();
    if (Date.now() >= deadline) void stop('test time budget exhausted');
    else if (Date.now() - state.lastProgressAt >= stallMs)
      void stop('no Cypress command or spec progress');
  }, 1000);
  const sampler = setInterval(() => {
    if (!captureInProgress && !stopping) void capture('periodic');
  }, intervalMs);
  const code = await completion;
  clearInterval(watchdog);
  clearInterval(sampler);
  if (stopping) await stopping;
  state.exitCode ??= code;
  state.finishedAt = Date.now();
  await capture('finished');
  saveState();
  server.closeAllConnections();
  server.close();
  process.exitCode = state.exitCode;
}
