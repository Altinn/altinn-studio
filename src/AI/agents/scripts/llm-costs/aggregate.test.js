import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate } from './aggregate.js';

const LOADED_AT = '2026-05-04T02:00:00.000Z';
const SERVICE_OWNER = 'ttd';

function makeObs({
  traceId = 'trace-1',
  startTime = '2026-05-03T10:00:00Z',
  model = 'gpt-4o',
  inputTokens = 100,
  outputTokens = 50,
  extraUsageDetails = {},
} = {}) {
  const usage = { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens };
  return {
    traceId,
    startTime,
    model,
    usage,
    usageDetails: { ...usage, ...extraUsageDetails },
  };
}

function makeTrace({ id = 'trace-1', appName = 'ttd-my-app', userId = SERVICE_OWNER } = {}) {
  return { id, userId, metadata: { app_name: appName } };
}

test('buckets observations into one row per (serviceOwner, appName, date)', () => {
  const obs = [makeObs()];
  const traces = new Map([['trace-1', makeTrace()]]);

  const rows = aggregate(obs, traces, LOADED_AT);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, '2026-05-03');
  assert.equal(rows[0].serviceownercode, SERVICE_OWNER);
  assert.equal(rows[0].serviceresourceid, 'ttd-my-app');
  assert.equal(rows[0].messagesender, SERVICE_OWNER);
});

test('splits observations across different days into separate rows', () => {
  const obs = [
    makeObs({ traceId: 'trace-1', startTime: '2026-05-03T10:00:00Z' }),
    makeObs({ traceId: 'trace-2', startTime: '2026-05-04T10:00:00Z' }),
  ];
  const traces = new Map([
    ['trace-1', makeTrace({ id: 'trace-1' })],
    ['trace-2', makeTrace({ id: 'trace-2' })],
  ]);

  const rows = aggregate(obs, traces, LOADED_AT);

  assert.equal(rows.length, 2);
  const dates = rows.map((r) => r.date).sort();
  assert.deepEqual(dates, ['2026-05-03', '2026-05-04']);
});

test('sums tokens across multiple observations in the same bucket', () => {
  const obs = [
    makeObs({ traceId: 'trace-1', inputTokens: 100, outputTokens: 50 }),
    makeObs({ traceId: 'trace-2', inputTokens: 200, outputTokens: 100 }),
  ];
  const traces = new Map([
    ['trace-1', makeTrace({ id: 'trace-1' })],
    ['trace-2', makeTrace({ id: 'trace-2' })],
  ]);

  const [row] = aggregate(obs, traces, LOADED_AT);

  assert.equal(row.input_tokens, 300);
  assert.equal(row.output_tokens, 150);
  assert.equal(row.total_tokens, 450);
});

test('warns and buckets under "unknown" when metadata.app_name is missing', () => {
  const obs = [makeObs()];
  const traces = new Map([['trace-1', { id: 'trace-1', userId: SERVICE_OWNER, metadata: {} }]]);

  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (msg) => warnings.push(msg);
  try {
    const rows = aggregate(obs, traces, LOADED_AT);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].serviceresourceid, 'unknown');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /trace-1/);
  } finally {
    console.warn = originalWarn;
  }
});

test('throws when trace.userId is missing', () => {
  const obs = [makeObs()];
  const traces = new Map([['trace-1', { id: 'trace-1', metadata: { app_name: 'ttd-my-app' } }]]);

  assert.throws(() => aggregate(obs, traces, LOADED_AT), /Missing service owner code/);
});

test('throws when trace is not found for an observation', () => {
  const obs = [makeObs({ traceId: 'unknown-trace' })];
  const traces = new Map();

  assert.throws(() => aggregate(obs, traces, LOADED_AT), /Missing trace/);
});

test('returns empty array for empty observations', () => {
  const rows = aggregate([], new Map(), LOADED_AT);
  assert.deepEqual(rows, []);
});

test('sets year, month, day as string parts of date', () => {
  const obs = [makeObs({ startTime: '2026-05-03T10:00:00Z' })];
  const traces = new Map([['trace-1', makeTrace()]]);

  const [row] = aggregate(obs, traces, LOADED_AT);

  assert.equal(row.year, '2026');
  assert.equal(row.month, '05');
  assert.equal(row.day, '03');
});

test('produces one row per service owner when observations span multiple owners', () => {
  const obs = [
    makeObs({ traceId: 'trace-ttd', startTime: '2026-05-03T10:00:00Z' }),
    makeObs({ traceId: 'trace-skd', startTime: '2026-05-03T11:00:00Z' }),
  ];
  const traces = new Map([
    ['trace-ttd', makeTrace({ id: 'trace-ttd', userId: 'ttd', appName: 'ttd-app' })],
    ['trace-skd', makeTrace({ id: 'trace-skd', userId: 'skd', appName: 'skd-app' })],
  ]);

  const rows = aggregate(obs, traces, LOADED_AT);

  assert.equal(rows.length, 2);
  const owners = rows.map((r) => r.serviceownercode).sort();
  assert.deepEqual(owners, ['skd', 'ttd']);
});

test('builds tokens_by_model with one entry per model in the bucket', () => {
  const obs = [makeObs({ inputTokens: 100, outputTokens: 50 })];
  const traces = new Map([['trace-1', makeTrace()]]);

  const [row] = aggregate(obs, traces, LOADED_AT);

  assert.deepEqual(row.tokens_by_model, {
    'gpt-4o': { input: 100, output: 50, total: 150 },
  });
});

test('keeps tokens for different models separate within the same bucket', () => {
  const obs = [
    makeObs({ traceId: 'trace-1', model: 'gpt-4o', inputTokens: 100, outputTokens: 50 }),
    makeObs({ traceId: 'trace-2', model: 'gpt-4o-mini', inputTokens: 200, outputTokens: 80 }),
  ];
  const traces = new Map([
    ['trace-1', makeTrace({ id: 'trace-1' })],
    ['trace-2', makeTrace({ id: 'trace-2' })],
  ]);

  const [row] = aggregate(obs, traces, LOADED_AT);

  assert.deepEqual(row.tokens_by_model, {
    'gpt-4o': { input: 100, output: 50, total: 150 },
    'gpt-4o-mini': { input: 200, output: 80, total: 280 },
  });
  assert.equal(row.input_tokens, 300);
  assert.equal(row.output_tokens, 130);
  assert.equal(row.total_tokens, 430);
});

test('preserves and sums non-standard usageDetails keys per model', () => {
  const obs = [
    makeObs({
      traceId: 'trace-1',
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 50,
      extraUsageDetails: { cache_read_input_tokens: 200 },
    }),
    makeObs({
      traceId: 'trace-2',
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 50,
      extraUsageDetails: { cache_read_input_tokens: 300 },
    }),
  ];
  const traces = new Map([
    ['trace-1', makeTrace({ id: 'trace-1' })],
    ['trace-2', makeTrace({ id: 'trace-2' })],
  ]);

  const [row] = aggregate(obs, traces, LOADED_AT);

  assert.deepEqual(row.tokens_by_model, {
    'claude-sonnet-4-6': {
      input: 200,
      output: 100,
      total: 300,
      cache_read_input_tokens: 500,
    },
  });
});

test('warns and buckets under "unknown" when obs.model is missing', () => {
  const obs = [{ ...makeObs(), model: undefined }];
  const traces = new Map([['trace-1', makeTrace()]]);

  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (msg) => warnings.push(msg);
  try {
    const [row] = aggregate(obs, traces, LOADED_AT);
    assert.ok(row.tokens_by_model.unknown);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /trace-1/);
  } finally {
    console.warn = originalWarn;
  }
});
