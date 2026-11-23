// Own the watchdog outside Cypress. A blocked renderer cannot prevent recovery.
// Keep Cypress and Percy alive so they can finish reporting the interrupted spec.
import { execFile, spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { BrowserDiagnostics } from './cypress-browser-diagnostics.mjs';

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
const continuationMs = setting('CYPRESS_BROWSER_CONTINUATION_MS', 30_000);
const deadline = Math.min(
  Date.now() + setting('CYPRESS_RUN_TIMEOUT_MS', 80 * 60_000),
  setting('CYPRESS_JOB_DEADLINE_MS', Number.MAX_SAFE_INTEGER),
);
const summary = { startedAt: Date.now(), completed: {}, stalls: [] };
const inactivityReason = 'no output/command/spec progress; renderer hang could not be confirmed';
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
}
function readState() {
  const file = path.join(runDirectory, 'cypress.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}
function updateCompleted(state) {
  Object.assign(summary.completed, state.completed);
  summary.specs ||= state.specs;
  summary.browser = state.browser;
  for (const event of summary.stalls) {
    if (event.signaledAt && Object.hasOwn(state.completed || {}, event.spec)) event.reported = true;
  }
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
  child.stdout.destroy();
  child.stderr.destroy();
}

// Refuse stale state instead of reading results left by a previous invocation.
const runDirectory = path.join(directory, 'run');
mkdirSync(runDirectory);
save();
const child = spawn(command, args, {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CYPRESS_DIAGNOSTICS_DIR: runDirectory },
});
let finished = false;
let lastOutput = Date.now();
let lastBrowserProgress = 0;
let nextProbe = 0;
let browser;
let continuation;
function latestProgress() {
  return Math.max(lastOutput, lastBrowserProgress, readState().updatedAt || summary.startedAt);
}
function observeProbe(probe) {
  for (const target of probe.targets) {
    lastBrowserProgress = Math.max(lastBrowserProgress, target.progressAt || 0);
  }
  return probe;
}
const completion = new Promise((resolve) => {
  child.once('error', (error) => {
    summary.launchError = error.message;
    finished = true;
    resolve(1);
  });
  child.once('exit', (code, signal) => {
    summary.signal = signal;
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
let exitCode;
try {
  while (!finished) {
    const state = readState();
    updateCompleted(state);
    if (interrupted || Date.now() >= deadline) {
      summary.stopReason = interrupted || 'overall time budget exhausted';
      break;
    }
    if (continuation) {
      // Console activity alone does not establish that Cypress handled the crash.
      // Wait for its after:spec result, including when the last spec was interrupted.
      if (Object.hasOwn(state.completed || {}, continuation.spec)) {
        continuation.reported = true;
        continuation = undefined;
      } else if (Date.now() >= continuation.deadline) {
        summary.stopReason = 'Cypress did not report the interrupted spec after Chrome stopped';
        break;
      } else {
        await Promise.race([completion, delay(1000)]);
        continue;
      }
    }
    const lastProgress = latestProgress();
    if (
      Date.now() - lastProgress >= suspectMs &&
      state.debugPort &&
      browser?.socket?.readyState !== WebSocket.OPEN &&
      Date.now() >= nextProbe
    ) {
      browser?.close();
      browser = new BrowserDiagnostics();
      try {
        await browser.connect(state.debugPort);
      } catch (error) {
        browser.close();
        summary.connectionError = error.message;
        nextProbe = Date.now() + 5000;
      }
    }
    if (
      Date.now() - lastProgress >= suspectMs &&
      Date.now() >= nextProbe &&
      browser?.socket?.readyState === WebSocket.OPEN
    ) {
      const first = observeProbe(await browser.probe());
      if (first.blockedTargets.length) {
        markDiagnostics();
        await delay(confirmMs);
        const second = observeProbe(await browser.probe());
        const progressed = () => finished || latestProgress() > lastProgress;
        if (
          !progressed() &&
          first.blockedTargets.some((id) => second.blockedTargets.includes(id))
        ) {
          const event = {
            number: summary.stalls.length + 1,
            at: Date.now(),
            spec: state.currentSpec,
            probes: [first, second],
          };
          summary.stalls.push(event);
          save();
          console.error(
            'Cypress watchdog: confirmed renderer stall; stopping Chrome so Cypress can continue.',
          );
          // Never stop a browser that progressed to another test or spec
          // while the renderer probes were in flight.
          if (!progressed() && !interrupted && Date.now() < deadline) {
            const { processInfo } = await browser.send('SystemInfo.getProcessInfo');
            const pid = processInfo.find((process) => process.type === 'browser')?.id;
            if (!Number.isSafeInteger(pid) || pid <= 1)
              throw new Error('Invalid Chrome browser PID');
            if (progressed() || interrupted || Date.now() >= deadline) {
              event.progressedBeforeStop = true;
              browser.close();
              save();
              continue;
            }
            // Cypress 15 recognizes SIGABRT/SIGTRAP as browser crashes, whereas
            // SIGKILL leaves it waiting. It reports this spec as failed, launches
            // fresh Chrome, and continues within the original Cloud recording.
            process.kill(pid, 'SIGABRT');
            event.browserPid = pid;
            event.signaledAt = Date.now();
            event.deadline = Date.now() + continuationMs;
            continuation = event;
            console.error(
              'Cypress watchdog: Chrome stopped; Cypress will fail this spec and continue.',
            );
          } else event.progressedBeforeStop = true;
          browser.close();
          save();
          continue;
        }
      }
      nextProbe = Date.now() + 30_000;
    }
    if (Date.now() - latestProgress() >= fallbackMs) {
      summary.stopReason = inactivityReason;
      break;
    }
    save();
    await Promise.race([completion, delay(1000)]);
  }
  if (summary.stopReason) {
    summary.atStop = { at: Date.now(), state: readState(), lastOutput, lastBrowserProgress };
    markDiagnostics();
    save();
    await terminate(child, completion);
    exitCode = 124;
  } else exitCode = await completion;
} catch (error) {
  summary.error = error.message;
  markDiagnostics();
  await terminate(child, completion);
  exitCode = 1;
} finally {
  browser?.close();
  updateCompleted(readState());
}
summary.missingSpecs = (summary.specs || []).filter(
  (spec) => !Object.hasOwn(summary.completed, spec),
);
const failures = Object.values(summary.completed).some(
  (result) => result.failures > 0 || result.error,
);
summary.exitCode = interrupted
  ? 130
  : failures ||
      summary.stalls.some((event) => event.signaledAt) ||
      !summary.specs?.length ||
      summary.missingSpecs.length
    ? 1
    : exitCode;
summary.finishedAt = Date.now();
save();
if (process.env.GITHUB_STEP_SUMMARY && summary.suspectedStall) {
  const stopped = summary.stalls.filter((event) => event.signaledAt);
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\nCypress shard ${process.env.E2E_SHARD_NUMBER || ''}: stopped Chrome for ${stopped.length} confirmed stalls. ` +
      `${stopped.filter((event) => event.reported).length} interrupted specs reported by Cypress. ` +
      `${summary.missingSpecs.length} specs lack a completed result. ` +
      `${summary.stopReason || summary.error || 'Cypress continued in the original recording.'} ` +
      `Interrupted specs remain failures. Recovery details are in the shard logs.\n`,
  );
}
process.exitCode = summary.exitCode;
