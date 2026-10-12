type CommandProgress = { id: string; name: string; startedAt: number };

/** CI-only progress reporting outside the Cypress command queue. */
export function installCypressDiagnostics() {
  const endpoint = Cypress.expose('diagnosticsUrl');
  if (typeof endpoint !== 'string' || !endpoint) {
    return;
  }

  const state = {
    source: 'browser',
    spec: Cypress.spec.relative,
    test: [] as string[],
    sequence: 0,
    pendingCommands: [] as CommandProgress[],
    lastCompletedCommand: null as CommandProgress | null,
    testState: 'starting',
  };
  let sending = false;
  let changed = true;

  const send = (event: string) => {
    if (sending) {
      return;
    }
    sending = true;
    changed = false;
    // Keep arguments, subjects, assertion values, and console logs out of the
    // report. They may contain the record key, login tokens, or form data.
    void fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ ...state, event, sentAt: Date.now() }),
      signal: AbortSignal.timeout(2000),
    })
      .catch(() => {
        /* Diagnostics must not fail or delay a test. */
      })
      .finally(() => {
        sending = false;
      });
  };

  const progress = () => {
    state.sequence++;
    changed = true;
  };

  Cypress.on('test:before:run', (_attributes, test) => {
    state.test = test.titlePath();
    state.testState = 'running';
    state.pendingCommands = [];
    progress();
  });
  Cypress.on('test:after:run', (_attributes, test) => {
    state.testState = test.state || 'finished';
    state.pendingCommands = [];
    progress();
    send('test:after:run');
  });
  Cypress.on('command:start', (command) => {
    state.pendingCommands.push({ id: String(command.get('id')), name: command.get('name'), startedAt: Date.now() });
    progress();
  });
  Cypress.on('command:end', (command) => {
    const id = String(command.get('id'));
    const index = state.pendingCommands.findIndex((pending) => pending.id === id);
    if (index !== -1) {
      state.lastCompletedCommand = state.pendingCommands[index];
      state.pendingCommands.splice(index, 1);
    }
    progress();
  });

  // Sample every five seconds. Heartbeats show whether the runner
  // renderer is responsive even when the command queue makes no progress.
  setInterval(() => send(changed ? 'progress' : 'heartbeat'), 5000);
  send('support:loaded');
}
