import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const wrapper = path.resolve(import.meta.dirname, 'run-cypress-with-diagnostics.mjs');
const browserSupport = pathToFileURL(
  path.resolve(import.meta.dirname, '../../src/App/frontend/test/e2e/support/diagnostics.ts'),
).href;
const reporter = `
const state = { source: 'browser', event: 'heartbeat', spec: 'fake-spec.ts', sequence: 1,
  pendingCommands: [{ id: '1', name: 'visit', startedAt: Date.now() }] };
const report = () => fetch(process.env.CYPRESS_DIAGNOSTICS_URL, {
  method: 'POST', body: JSON.stringify(state)
}).catch(() => {});
await report();
setInterval(report, 100);
`;

async function launch(t, source, settings = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cypress-diagnostics-test-'));
  const outputDir = path.join(dir, 'diagnostics');
  const fixture = path.join(dir, 'child.mjs');
  await writeFile(fixture, source);
  const child = spawn(
    process.execPath,
    [wrapper, process.execPath, fixture, 'private-record-key'],
    {
      env: {
        ...process.env,
        CYPRESS_DIAGNOSTICS_DIR: outputDir,
        CYPRESS_RUN_TIMEOUT_MS: '30000',
        CYPRESS_JOB_DEADLINE_MS: String(Date.now() + 30000),
        CYPRESS_STALL_TIMEOUT_MS: '30000',
        CYPRESS_TERMINATION_GRACE_MS: '100',
        CYPRESS_DIAGNOSTICS_INTERVAL_MS: '200',
        ...settings,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (data) => {
    output += data;
  });
  child.stderr.on('data', (data) => {
    output += data;
  });
  const completion = new Promise((resolve) => child.once('close', (code) => resolve(code)));
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGKILL');
      try {
        const state = JSON.parse(await readFile(path.join(outputDir, 'state.json'), 'utf8'));
        process.kill(-state.childPid, 'SIGKILL');
      } catch {
        /* The fixture may not have started. */
      }
    }
    await rm(dir, { recursive: true, force: true });
  });
  return {
    child,
    completion,
    outputDir,
    readState: async () => JSON.parse(await readFile(path.join(outputDir, 'state.json'), 'utf8')),
    output: () => output,
  };
}

test(
  'preserves success and failure exit codes and saves evidence for both',
  { timeout: 10000 },
  async (t) => {
    for (const code of [0, 7]) {
      const run = await launch(t, `process.exit(${code});`);
      assert.equal(await run.completion, code, run.output());
      assert.equal((await run.readState()).exitCode, code);
      assert.ok((await readdir(run.outputDir)).includes('finished.json'));
    }
  },
);

test(
  'browser heartbeats and CLI output do not hide a stalled command',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(
      t,
      `${reporter}\nsetInterval(() => console.log('still alive'), 100);`,
      {
        CYPRESS_STALL_TIMEOUT_MS: '1200',
      },
    );
    assert.equal(await run.completion, 124, run.output());
    const state = await run.readState();
    assert.equal(state.stopReason, 'no Cypress command or spec progress');
    assert.equal(state.browser.pendingCommands[0].name, 'visit');
    assert.ok(state.browser.receivedAt > state.lastProgressAt);
    assert.ok(state.lastOutputAt > state.lastProgressAt);
    const beforeStop = JSON.parse(
      await readFile(path.join(run.outputDir, 'before-stop.json'), 'utf8'),
    );
    assert.ok(beforeStop.processes.includes(String(state.childPid)));
    assert.ok(beforeStop.threads);
    for (const filename of await readdir(run.outputDir)) {
      assert.ok(
        !(await readFile(path.join(run.outputDir, filename), 'utf8')).includes(
          'private-record-key',
        ),
      );
    }
  },
);

test(
  'browser event handlers report a pending command without using the Cypress queue',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(
      t,
      `
const handlers = new Map();
// Accelerate only the browser reporter's timer; the watchdog uses a separate process.
const originalSetInterval = globalThis.setInterval;
globalThis.setInterval = (callback, interval) => originalSetInterval(callback, Math.min(interval, 100));
globalThis.Cypress = {
  expose: () => process.env.CYPRESS_DIAGNOSTICS_URL,
  spec: { relative: 'browser-events.ts' },
  on: (event, callback) => handlers.set(event, callback),
};
globalThis.cy = { task: () => { throw new Error('Diagnostics must bypass the command queue'); } };
const { installCypressDiagnostics } = await import(${JSON.stringify(browserSupport)});
installCypressDiagnostics();
handlers.get('test:before:run')({}, { titlePath: () => ['suite', 'stalled test'] });
const command = (id, name) => ({ get: (key) => ({ id, name, args: ['private-record-key'] })[key] });
handlers.get('command:start')(command('1', 'visit'));
handlers.get('command:end')(command('1', 'visit'));
handlers.get('command:start')(command('2', 'then'));
`,
      { CYPRESS_STALL_TIMEOUT_MS: '2500' },
    );
    assert.equal(await run.completion, 124, run.output());
    const state = await run.readState();
    assert.deepEqual(state.browser.test, ['suite', 'stalled test']);
    assert.equal(state.browser.pendingCommands[0].name, 'then');
    assert.equal(state.browser.lastCompletedCommand.name, 'visit');
    assert.ok(!JSON.stringify(state).includes('private-record-key'));
  },
);

test('browser diagnostics stay disabled outside the wrapper', { timeout: 10000 }, async (t) => {
  const run = await launch(
    t,
    `
globalThis.Cypress = { expose: () => '', on: () => { throw new Error('Diagnostics should be disabled'); } };
const { installCypressDiagnostics } = await import(${JSON.stringify(browserSupport)});
installCypressDiagnostics();
`,
  );
  assert.equal(await run.completion, 0, run.output());
  assert.equal((await run.readState()).browser, null);
});

test(
  'browser probes run only after stopping is decided and cannot strand collection',
  { timeout: 15000 },
  async (t) => {
    const run = await launch(
      t,
      `
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const server = createServer((_request, response) => {
  const diagnosticState = JSON.parse(readFileSync(path.join(process.env.CYPRESS_DIAGNOSTICS_DIR, 'state.json'), 'utf8'));
  if (!diagnosticState.stopReason) throw new Error('Debugger contacted before a stall or deadline');
  response.end(JSON.stringify([{ type: 'page', url: 'http://example.test/?private-record-key',
    webSocketDebuggerUrl: 'ws://127.0.0.1:' + server.address().port + '/ws' }]));
});
server.on('upgrade', (request, socket) => {
  const accept = createHash('sha1').update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: ' + accept + '\\r\\n\\r\\n');
  // Deliberately ignore both Runtime.evaluate and the WebSocket close frame.
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = path.join(import.meta.dirname, 'chrome');
const sleeper = path.join(import.meta.dirname, 'browser.mjs');
symlinkSync(process.execPath, chrome);
writeFileSync(sleeper, 'setInterval(() => {}, 1000);');
spawn(chrome, [sleeper, '--remote-debugging-port=' + server.address().port], { stdio: 'inherit', detached: true });
${reporter}
`,
      { CYPRESS_RUN_TIMEOUT_MS: '1500' },
    );
    assert.equal(await run.completion, 124, run.output());
    const snapshot = JSON.parse(
      await readFile(path.join(run.outputDir, 'before-stop.json'), 'utf8'),
    );
    assert.equal(snapshot.browsers[0].debuggerResponsive, true);
    assert.equal(snapshot.browsers[0].pages[0].responsive, false);
    assert.equal(snapshot.browsers[0].pages[0].reason, 'CDP response timed out');
    assert.equal(snapshot.browsers[0].pages[0].url, 'http://example.test/');
    assert.ok(!JSON.stringify(snapshot).includes('private-record-key'));
    for (const filename of await readdir(run.outputDir)) {
      if (
        filename === 'started.json' ||
        filename === 'finished.json' ||
        filename.startsWith('sample-')
      ) {
        const passive = JSON.parse(await readFile(path.join(run.outputDir, filename), 'utf8'));
        assert.equal(Object.hasOwn(passive, 'browsers'), false, filename);
      }
    }
  },
);

test(
  'the total budget expires even when commands keep progressing',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(t, `${reporter}\nsetInterval(() => state.sequence++, 100);`, {
      CYPRESS_RUN_TIMEOUT_MS: '1500',
    });
    assert.equal(await run.completion, 124, run.output());
    assert.equal((await run.readState()).stopReason, 'test time budget exhausted');
  },
);

test(
  'shutdown events cannot erase the command that triggered the watchdog',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(
      t,
      `${reporter}
process.on('SIGTERM', async () => {
  state.pendingCommands = [];
  state.sequence++;
  state.testState = 'failed';
  await report();
  process.exit(0);
});
`,
      { CYPRESS_STALL_TIMEOUT_MS: '1200' },
    );
    assert.equal(await run.completion, 124, run.output());
    const state = await run.readState();
    assert.deepEqual(state.browser.pendingCommands, []);
    assert.equal(state.atStop.browser.pendingCommands[0].name, 'visit');
    const snapshot = JSON.parse(
      await readFile(path.join(run.outputDir, 'before-stop.json'), 'utf8'),
    );
    assert.equal(snapshot.cypress.browser.pendingCommands[0].name, 'visit');
  },
);

test(
  'the job deadline shortens the test budget after a long setup',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(t, reporter, { CYPRESS_JOB_DEADLINE_MS: String(Date.now() + 1500) });
    assert.equal(await run.completion, 124, run.output());
    assert.equal((await run.readState()).stopReason, 'test time budget exhausted');
  },
);

test(
  'does not start Cypress when setup has consumed the job budget',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(t, "throw new Error('Cypress must not start');", {
      CYPRESS_JOB_DEADLINE_MS: String(Date.now() - 1000),
    });
    assert.equal(await run.completion, 124, run.output());
    const state = await run.readState();
    assert.equal(state.stopReason, 'job cleanup deadline reached during setup');
    assert.equal(state.childPid, undefined);
  },
);

test(
  'captures evidence on cancellation and kills descendants that ignore SIGTERM',
  { timeout: 10000 },
  async (t) => {
    const run = await launch(
      t,
      `
import { spawn } from 'node:child_process';
process.on('SIGTERM', () => {});
const descendant = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], { stdio: 'inherit', detached: true });
${reporter}
state.descendantPid = descendant.pid;
`,
    );
    let state;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        state = await run.readState();
        if (state.browser?.descendantPid) break;
      } catch {
        /* The wrapper is starting. */
      }
      await delay(30);
    }
    assert.ok(state.browser?.descendantPid);
    run.child.kill('SIGTERM');
    assert.equal(await run.completion, 143, run.output());
    assert.equal((await run.readState()).stopReason, 'wrapper received SIGTERM');
    assert.ok((await readdir(run.outputDir)).includes('before-stop.json'));
    try {
      const stat = await readFile(`/proc/${state.browser.descendantPid}/stat`, 'utf8');
      assert.equal(
        stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0],
        'Z',
        'descendant must have exited',
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  },
);
