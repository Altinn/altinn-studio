// Own the watchdog outside Cypress. A blocked renderer cannot prevent capture,
// cleanup, or the single recovery attempt. Percy stays outside this wrapper.
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { BrowserDiagnostics } from './cypress-browser-diagnostics.mjs';
import { nativeBrowserStacks } from './cypress-native-stacks.mjs';

const execFileAsync = promisify(execFile);
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Usage: run-cypress-with-diagnostics.mjs <command> [args...]');
function setting(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return value;
}
const directory = path.resolve(
  process.env.CYPRESS_DIAGNOSTICS_DIR || 'test/logs/cypress-diagnostics',
);
mkdirSync(directory, { recursive: true });
const suspectMs = setting('CYPRESS_STALL_SUSPECT_MS', 120_000);
const fallbackMs = setting('CYPRESS_STALL_FALLBACK_MS', 15 * 60_000);
const confirmMs = setting('CYPRESS_STALL_CONFIRM_MS', 5000);
const graceMs = setting('CYPRESS_TERMINATION_GRACE_MS', 5000);
const deadline = Math.min(
  Date.now() + setting('CYPRESS_RUN_TIMEOUT_MS', 80 * 60_000),
  setting('CYPRESS_JOB_DEADLINE_MS', Number.MAX_SAFE_INTEGER),
);
const summary = {
  startedAt: Date.now(),
  attempts: [],
  completed: {},
  testFailures: [],
  recovered: false,
};
// after:spec cannot report failures from a spec whose later test hangs. Retain
// final test failures independently, so replaying that spec cannot erase them.
const endpoint = `/${randomUUID()}`;
const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (request.url !== endpoint || request.method !== 'POST') return response.writeHead(404).end();
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 16384) return response.writeHead(413).end();
    }
    const failure = JSON.parse(body);
    if (typeof failure.spec !== 'string' || typeof failure.title !== 'string')
      return response.writeHead(400).end();
    summary.testFailures.push(failure);
    save();
    response.writeHead(204).end();
  } catch {
    response.writeHead(400).end();
  }
});
server.requestTimeout = 3000;
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
let interrupted;
process.on('SIGTERM', () => {
  interrupted = 'SIGTERM';
});
process.on('SIGINT', () => {
  interrupted = 'SIGINT';
});

function save() {
  writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
}
function markDiagnostics() {
  summary.suspectedStall = true;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'diagnostics=true\n');
}
function readState(attemptDirectory) {
  const file = path.join(attemptDirectory, 'cypress.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}
function updateCompleted(state) {
  Object.assign(summary.completed, state.completed);
}

async function terminate(child, completion) {
  // Chromium can create separate process groups. Discover descendants before
  // their parents exit, then signal only groups owned by this Cypress invocation.
  const groups = new Set([child.pid]);
  try {
    const { stdout } = await execFileAsync('ps', ['-eo', 'pid,ppid,pgid'], { timeout: 3000 });
    const rows = stdout
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.trim().split(/\s+/).map(Number));
    const owned = new Set([child.pid]);
    let size;
    do {
      size = owned.size;
      for (const [pid, parent] of rows) if (owned.has(parent)) owned.add(pid);
    } while (size !== owned.size);
    for (const [pid, , group] of rows) if (owned.has(pid)) groups.add(group);
  } catch (error) {
    summary.cleanupError = error.message;
  }
  const signal = (name) => {
    for (const group of groups) {
      try {
        process.kill(-group, name);
      } catch (error) {
        if (error.code !== 'ESRCH') summary.cleanupError = error.message;
      }
    }
  };
  signal('SIGTERM');
  await delay(graceMs);
  signal('SIGKILL');
  // Do not wait indefinitely for inherited pipes from a detached descendant.
  await Promise.race([completion, delay(3000)]);
}

async function capture(child, browser, attemptDirectory, attempt) {
  // Trace retrieval can fail independently. Always proceed to native capture.
  if (browser)
    await browser.saveTrace().catch((error) => {
      attempt.traceError = error.message;
    });
  attempt.native = [];
  for (let sample = 1; sample <= 2; sample++) {
    const output = path.join(attemptDirectory, `native-${sample}`);
    mkdirSync(output, { recursive: true });
    try {
      const stacks = await nativeBrowserStacks(child.pid, output);
      attempt.native.push(stacks);
      writeFileSync(path.join(output, 'capture.json'), JSON.stringify(stacks, null, 2));
    } catch (error) {
      attempt.native.push({ error: error.message });
    }
    save();
    if (sample === 1) await delay(confirmMs);
  }
}

async function runAttempt(number, remaining) {
  const attemptDirectory = path.join(directory, `attempt-${number}`);
  // Refuse stale attempts instead of reading results left by a previous run.
  mkdirSync(attemptDirectory);
  const attempt = { number, startedAt: Date.now(), probes: [] };
  summary.attempts.push(attempt);
  save();
  const attemptArgs = [...args];
  // Cloud groups have immutable spec lists. Recovery uses a separate group in
  // the same build, rather than presenting a smaller list as the original group.
  if (number > 1) {
    const group = attemptArgs.indexOf('--group');
    if (group !== -1) attemptArgs[group + 1] += '-recovery';
  }
  let remainingFile;
  if (remaining) {
    remainingFile = path.join(attemptDirectory, 'remaining.json');
    writeFileSync(remainingFile, JSON.stringify(remaining));
  }
  const child = spawn(command, attemptArgs, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CYPRESS_DIAGNOSTICS_DIR: attemptDirectory,
      CYPRESS_DIAGNOSTICS_REMAINING: remainingFile || '',
      CYPRESS_DIAGNOSTICS_URL: `http://127.0.0.1:${server.address().port}${endpoint}`,
    },
  });
  let finished = false;
  let lastOutput = Date.now();
  let nextProbe = 0;
  let browser;
  const completion = new Promise((resolve) => {
    child.once('error', (error) => {
      attempt.launchError = error.message;
      finished = true;
      resolve(1);
    });
    child.once('exit', (code, signal) => {
      attempt.signal = signal;
      finished = true;
      resolve(code ?? 1);
    });
  });
  for (const [stream, output] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (chunk) => {
      lastOutput = Date.now();
      output.write(chunk);
    });
  }
  let state = {};
  try {
    while (!finished) {
      state = readState(attemptDirectory);
      updateCompleted(state);
      attempt.browser = state.browser;
      if (!summary.specs && state.specs) summary.specs = state.specs;
      const lastProgress = Math.max(lastOutput, state.updatedAt || attempt.startedAt);
      if (
        state.debugPort &&
        browser?.socket?.readyState !== WebSocket.OPEN &&
        Date.now() >= nextProbe
      ) {
        browser?.close();
        browser = new BrowserDiagnostics(attemptDirectory);
        try {
          await browser.connect(state.debugPort);
          if (browser.traceError) {
            attempt.traceError = browser.traceError;
            console.error(
              `::warning::Cypress diagnostics: tracing unavailable: ${browser.traceError}`,
            );
          }
        } catch (error) {
          browser.close();
          attempt.connectionError = error.message;
          nextProbe = Date.now() + 5000;
        }
      }
      if (interrupted || Date.now() >= deadline) {
        attempt.stopReason = interrupted || 'overall time budget exhausted';
        break;
      }
      if (
        Date.now() - lastProgress >= suspectMs &&
        Date.now() >= nextProbe &&
        browser?.socket?.readyState === WebSocket.OPEN
      ) {
        const first = await browser.probe();
        attempt.probes.push(first);
        if (first.blockedTargets.length) {
          markDiagnostics();
          // Freeze pre-hang scheduler history before more events overwrite it.
          await browser.saveTrace();
          await delay(confirmMs);
          const second = await browser.probe();
          attempt.probes.push(second);
          const current = readState(attemptDirectory);
          const progressed =
            finished || current.updatedAt > (state.updatedAt || 0) || lastOutput > lastProgress;
          if (
            !progressed &&
            first.blockedTargets.some((id) => second.blockedTargets.includes(id))
          ) {
            attempt.stalled = true;
            attempt.stopReason = 'renderer unresponsive in two independent probes';
            break;
          }
          // A transient pause already has a saved trace. Reconnect to start a
          // fresh bounded trace without retaining an ever-growing healthy log.
          browser.close();
        }
        nextProbe = Date.now() + 30_000;
      }
      if (Date.now() - lastProgress >= fallbackMs) {
        attempt.stopReason = 'no output/spec progress; renderer hang could not be confirmed';
        break;
      }
      save();
      await Promise.race([completion, delay(1000)]);
    }
    if (attempt.stopReason) {
      // Snapshot the decision before debugger attachment or termination changes it.
      attempt.atStop = { at: Date.now(), state, lastOutput };
      save();
      markDiagnostics();
      console.error(`Cypress diagnostics: ${attempt.stopReason}; capturing before termination.`);
      await capture(child, browser, attemptDirectory, attempt);
      await terminate(child, completion);
      attempt.exitCode = 124;
    } else attempt.exitCode = await completion;
  } catch (error) {
    attempt.error = error.message;
    await terminate(child, completion);
    attempt.exitCode = 1;
  } finally {
    browser?.close();
    // Capture results completed during probing, but never treat teardown of the
    // interrupted spec as a successful completion.
    state = readState(attemptDirectory);
    if (!summary.specs && state.specs) summary.specs = state.specs;
    for (const [spec, result] of Object.entries(state.completed || {})) {
      if (attempt.stopReason && spec === attempt.atStop?.state.currentSpec) continue;
      summary.completed[spec] = result;
    }
    attempt.finishedAt = Date.now();
    save();
  }
  return attempt;
}

const first = await runAttempt(1);
let last = first;
if (first.stalled && !interrupted && Date.now() + 60_000 < deadline && summary.specs?.length) {
  const remaining = summary.specs.filter((spec) => !Object.hasOwn(summary.completed, spec));
  if (remaining.length) {
    console.error(
      `Cypress diagnostics: restarting once, with ${remaining.length} unfinished specs.`,
    );
    last = await runAttempt(2, remaining);
    summary.recovered = last.exitCode === 0;
  }
}
const failures =
  summary.testFailures.length > 0 ||
  Object.values(summary.completed).some((result) => result.failures > 0 || result.error);
summary.missingSpecs = (summary.specs || []).filter(
  (spec) => !Object.hasOwn(summary.completed, spec),
);
summary.exitCode = interrupted
  ? 130
  : failures || !summary.specs?.length || summary.missingSpecs.length
    ? 1
    : last.exitCode;
summary.finishedAt = Date.now();
save();
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `diagnostics=${Boolean(summary.suspectedStall)}\n`);
if (process.env.GITHUB_STEP_SUMMARY && summary.attempts.some((attempt) => attempt.stopReason)) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\nCypress shard ${process.env.E2E_SHARD_NUMBER || ''}: ${first.stopReason}. ` +
      `${summary.attempts.length === 2 ? `One recovery attempted; ${summary.recovered ? 'remaining specs passed' : 'recovery failed'}.` : 'No recovery attempted.'} ` +
      `Earlier failures remain failures. Diagnostics are retained even if recovery passes.\n`,
  );
}
process.exitCode = summary.exitCode;
server.closeAllConnections();
server.close();
