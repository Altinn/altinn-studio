// Run outside Percy and Cypress so their event loops cannot block the watchdog.
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

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

async function nativeBrowserStacks(processes) {
  const rows = processes
    .split('\n')
    .slice(1)
    .map((line) => {
      const fields = line.trim().split(/\s+/);
      return {
        pid: Number(fields[0]),
        parent: Number(fields[1]),
        age: Number(fields[7]),
        name: fields.at(-1),
      };
    });
  const descendants = (roots) => {
    const found = new Set(roots);
    let previousSize;
    do {
      previousSize = found.size;
      for (const row of rows) if (found.has(row.parent)) found.add(row.pid);
    } while (found.size !== previousSize);
    return found;
  };
  const testProcesses = descendants([child?.pid]);
  const cypress = rows.filter((row) => testProcesses.has(row.pid) && row.name === 'Cypress');
  const cypressMain = new Set(
    cypress
      .filter((row) => !cypress.some((parent) => parent.pid === row.parent))
      .map((row) => row.pid),
  );
  // Percy has its own Chrome. Limit capture to descendants of Cypress itself.
  const browserProcesses = descendants(cypress.map((row) => row.pid));
  const targets = [];
  const processRoles = [];
  const discoveryErrors = [];
  for (const row of rows) {
    if (!browserProcesses.has(row.pid) || !/^(Cypress|chrome|chromium)$/.test(row.name)) continue;
    // The owned Cypress root is identified by ancestry. Reading its arguments
    // is unnecessary and can fail even while the browser is still alive.
    if (cypressMain.has(row.pid)) {
      targets.push({ pid: row.pid, age: row.age, role: 'cypress' });
      processRoles.push({ pid: row.pid, parent: row.parent, role: 'cypress' });
      continue;
    }
    try {
      // Inspect only the process type; never retain command arguments or tokens.
      // Read sandbox processes with the same privileges as gdb.
      const { stdout: commandLine } = await execFileAsync(
        'sudo',
        ['-n', 'cat', `/proc/${row.pid}/cmdline`],
        { timeout: 2000, maxBuffer: 32768 },
      );
      // Chromium rewrites child argv into one space-separated process title.
      // Accept both that title and the original null-separated arguments.
      const type = commandLine.match(/(?:^|[\0 ])--type=([a-z-]+)(?=[\0 ]|$)/)?.[1];
      const role =
        type === 'renderer'
          ? 'renderer'
          : !type && commandLine.length > 0 && cypressMain.has(row.parent)
            ? 'browser'
            : null;
      processRoles.push({
        pid: row.pid,
        parent: row.parent,
        role: role || (['gpu-process', 'zygote', 'utility'].includes(type) ? type : 'unknown'),
        commandLineEmpty: commandLine.length === 0,
      });
      if (role) targets.push({ pid: row.pid, age: row.age, role });
    } catch (error) {
      discoveryErrors.push({ pid: row.pid, code: error.code, signal: error.signal });
    }
  }
  const selected = [
    ...targets
      .filter((target) => target.role === 'renderer')
      .sort((a, b) => a.age - b.age || b.pid - a.pid)
      .slice(0, 2),
    ...targets.filter((target) => target.role === 'browser').slice(0, 1),
    ...targets.filter((target) => target.role === 'cypress').slice(0, 1),
  ];
  const stacks = [];
  for (const target of selected) {
    const filename = `native-${target.role}-${target.pid}.log`;
    let result;
    let failure;
    try {
      // Root can attach to Chrome's non-dumpable sandbox processes. GNU timeout
      // bounds the privileged debugger itself, including symbol loading.
      result = await execFileAsync(
        'sudo',
        [
          '-n',
          'timeout',
          '--kill-after=2s',
          '15s',
          'gdb',
          '--batch',
          '--nx',
          '--nh',
          '-iex',
          'set auto-load off',
          '-iex',
          'set debuginfod enabled off',
          '-iex',
          'set print frame-arguments none',
          '-p',
          String(target.pid),
          '-ex',
          `python assert gdb.selected_inferior().pid == ${target.pid}`,
          '-ex',
          "python executable = gdb.current_progspace().filename; objfile = next((objfile for objfile in gdb.objfiles() if objfile.filename == executable), None); print('Executable:', executable); print('Build ID:', objfile.build_id if objfile else None)",
          '-ex',
          'info proc mappings',
          ...(target.role !== 'cypress'
            ? ['-ex', `source ${path.join(import.meta.dirname, 'chrome-frame-unwinder.py')}`]
            : []),
          '-ex',
          'thread apply all bt 30',
          '-ex',
          'detach',
        ],
        { timeout: 20000, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024 },
      );
    } catch (error) {
      result = error;
      failure = { code: error.code, signal: error.signal };
    }
    writeFileSync(path.join(outputDir, filename), `${result.stdout || ''}\n${result.stderr || ''}`);
    stacks.push({
      ...target,
      filename,
      captured: /\n#0\s+/.test(result.stdout || ''),
      ...(failure && { failure }),
    });
  }
  return {
    stacks,
    processRoles,
    discoveryErrors,
    missingRoles: ['renderer', 'browser', 'cypress'].filter(
      (role) => !selected.some((target) => target.role === role),
    ),
    browser: state.browserLaunch,
    ...(selected.length === 0 && { error: 'No Cypress browser processes found' }),
  };
}

async function capture(reason) {
  // Serialize snapshots so shutdown waits for any bounded capture already running.
  if (captureInProgress) await captureInProgress;
  captureInProgress = (async () => {
    saveState();
    const snapshot = {
      capturedAt: Date.now(),
      reason,
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
    } catch (error) {
      snapshot.captureError = error.message;
    }
    if (reason === 'before-stop') {
      // Save passive evidence first, even if a native debugger cannot attach.
      writeFileSync(path.join(outputDir, 'before-stop.json'), JSON.stringify(snapshot, null, 2));
      if (state.stopReason === 'no Cypress command or spec progress')
        snapshot.nativeBrowserStacks = await nativeBrowserStacks(snapshot.processes || '');
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
    try {
      await capture('before-stop');
    } catch (error) {
      state.captureError = error.code || error.name;
      saveState();
    }
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
