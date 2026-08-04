import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  alertKey,
  buildSlackPayload,
  groupByWebhookKey,
  matchOwners,
  oneLine,
  parseCodeowners,
  parseJsonEnv,
  parseNextLink,
} from './dependabot-notify.mjs';

const RULES = parseCodeowners(fs.readFileSync('.github/CODEOWNERS', 'utf8'));

function alert(overrides = {}) {
  return {
    number: 1,
    repo: 'Altinn/altinn-studio',
    html_url: 'https://example.test/1',
    security_advisory: { severity: 'high', summary: 'Something bad' },
    dependency: {
      package: { name: 'Some.Package' },
      manifest_path: 'src/App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj',
    },
    ...overrides,
  };
}

test('the last matching rule wins, not the first', () => {
  const rules = parseCodeowners(
    [
      'src/Designer/frontend/**/package.json @utforming',
      'src/Designer/frontend/resourceadm/**/package.json @access-info',
    ].join('\n'),
  );

  assert.deepEqual(matchOwners(rules, 'src/Designer/frontend/dashboard/package.json'), [
    '@utforming',
  ]);
  assert.deepEqual(matchOwners(rules, 'src/Designer/frontend/resourceadm/package.json'), [
    '@access-info',
  ]);
});

test('pagination follows the cursor GitHub returns, and stops on the last page', () => {
  const header =
    '<https://api.github.com/repositories/1/dependabot/alerts?after=CURSOR>; rel="next", ' +
    '<https://api.github.com/repositories/1/dependabot/alerts?before=X>; rel="prev"';

  assert.equal(
    parseNextLink(header),
    'https://api.github.com/repositories/1/dependabot/alerts?after=CURSOR',
  );
  assert.equal(parseNextLink('<https://x>; rel="prev"'), null);
  assert.equal(parseNextLink(null), null);
});

test('an unmatched path yields no owner rather than throwing', () => {
  assert.deepEqual(matchOwners(RULES, 'docs/readme.md'), []);
  assert.deepEqual(matchOwners(RULES, ''), []);
});

const ROUTING_CASES = [
  ['src/App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj', 'utforming'],
  ['yarn.lock', 'utforming'],
  ['src/Runtime/pdf3/yarn.lock', 'kjoring'],
  ['src/Runtime/workflow-engine/src/WorkflowEngine.Core/WorkflowEngine.Core.csproj', 'flyt'],
  ['src/App/template/src/App/App.csproj', 'data'],
];

for (const [manifestPath, team] of ROUTING_CASES) {
  test(`routes ${manifestPath} to ${team}`, () => {
    assert.deepEqual(matchOwners(RULES, manifestPath), [`@altinn/team-altinn-studio-${team}`]);
  });
}

test('resourceadm belongs to access-info, not utforming', () => {
  assert.deepEqual(matchOwners(RULES, 'src/Designer/frontend/resourceadm/package.json'), [
    '@altinn/team-access-info',
  ]);
});

test('the dedup key includes the repo, because alert numbers are per repository', () => {
  assert.notEqual(
    alertKey({ repo: 'Altinn/altinn-studio', number: 2 }),
    alertKey({ repo: 'Altinn/altinn-storage', number: 2 }),
  );
});

test('alerts are split across the owning teams', () => {
  const groups = groupByWebhookKey({
    alerts: [
      alert({ number: 1 }),
      alert({
        number: 2,
        dependency: {
          package: { name: 'X' },
          manifest_path:
            'src/Runtime/workflow-engine/src/WorkflowEngine.Core/WorkflowEngine.Core.csproj',
        },
      }),
    ],
    rules: RULES,
    repoOwners: {},
  });

  assert.deepEqual([...groups.keys()].sort(), [
    'altinn/team-altinn-studio-flyt',
    'altinn/team-altinn-studio-utforming',
  ]);
});

test('a repo with a configured owner bypasses CODEOWNERS', () => {
  const groups = groupByWebhookKey({
    alerts: [alert({ repo: 'Altinn/altinn-storage' })],
    rules: RULES,
    repoOwners: { 'Altinn/altinn-storage': '@altinn/team-altinn-studio-data' },
  });

  assert.deepEqual([...groups.keys()], ['altinn/team-altinn-studio-data']);
});

test('unowned paths and missing manifests land in fallback rather than vanishing', () => {
  const groups = groupByWebhookKey({
    alerts: [
      alert({
        number: 1,
        dependency: { package: { name: 'X' }, manifest_path: 'unknown/path.json' },
      }),
      alert({ number: 2, dependency: { package: { name: 'Y' } } }),
    ],
    rules: RULES,
    repoOwners: {},
  });

  assert.deepEqual([...groups.keys()], ['fallback']);
  assert.equal(groups.get('fallback').length, 2);
});

test('advisory summaries containing markup are escaped', () => {
  const payload = buildSlackPayload('team-a', [
    alert({ security_advisory: { severity: 'high', summary: 'XSS via <script> & friends' } }),
  ]);

  const text = JSON.stringify(payload);
  assert.ok(text.includes('&lt;script&gt;'));
  assert.ok(!text.includes('<script>'));
});

test('a malformed webhook secret is never echoed back into the log', () => {
  const secret = '{"team-a": "https://hooks.slack.test/T000/B000/xxxxxxxxxxxx"';
  process.env.PARSE_LEAK_FIXTURE = secret;

  try {
    assert.throws(
      () => parseJsonEnv('PARSE_LEAK_FIXTURE', {}),
      (error) => {
        assert.equal(error.message, 'PARSE_LEAK_FIXTURE is not valid JSON');
        assert.ok(!error.stack.includes('hooks.slack.test'));
        return true;
      },
    );
  } finally {
    delete process.env.PARSE_LEAK_FIXTURE;
  }
});

test('an unset variable falls back instead of throwing', () => {
  assert.deepEqual(parseJsonEnv('DEFINITELY_NOT_SET_12345', { a: 1 }), { a: 1 });
});

test('text interpolated into a workflow command cannot open a second command', () => {
  assert.equal(
    oneLine('HTTP 500 boom\n::add-mask::something\n::error::injected'),
    'HTTP 500 boom ::add-mask::something ::error::injected',
  );
  assert.ok(!oneLine('a\r\nb').includes('\n'));
});

test('masking keeps the whole webhook URL intact', () => {
  const url = `https://hooks.slack.test/services/${'x'.repeat(300)}`;
  assert.equal(oneLine(url), url);
});

test('payloads stay within the Slack 50-block limit', () => {
  const payload = buildSlackPayload(
    'team-a',
    Array.from({ length: 200 }, (_, index) => alert({ number: index })),
  );

  assert.ok(payload.blocks.length <= 50, `expected <= 50 blocks, got ${payload.blocks.length}`);
  assert.ok(JSON.stringify(payload).includes('and 155 more'));
});
