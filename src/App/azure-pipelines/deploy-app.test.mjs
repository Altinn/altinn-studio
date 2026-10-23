import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Run the actual pipeline step, not a second implementation of its merge logic.
const pipeline = JSON.parse(
  execFileSync('yq', ['-o=json', '.', fileURLToPath(new URL('deploy-app.yaml', import.meta.url))]),
);
const step = pipeline.steps.find(
  (step) =>
    step.displayName ===
    'Generate final helmrelease with merged values from values and overrides file',
);
assert.ok(step?.inputs.script, 'deployment values merge step must exist');

function deploy(t, files = {}, environment = 'tt02', overrides = {}, customIngress) {
  const root = mkdtempSync(join(tmpdir(), 'deployment-values-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = join(root, 'app-commit');
  const artifact = join(root, 'flux-artifact');
  mkdirSync(join(app, 'deployment'), { recursive: true });
  mkdirSync(artifact);
  if (customIngress) {
    writeFileSync(join(app, 'custom-ingress-routes.yaml'), JSON.stringify(customIngress));
  }
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(
      join(app, 'deployment', name),
      typeof contents === 'string' ? contents : JSON.stringify(contents),
    );
  }
  writeFileSync(join(artifact, pipeline.variables.HELMRELEASE_FILE), 'spec:\n  values: {}\n');
  writeFileSync(join(artifact, pipeline.variables.OVERRIDES_FILE), JSON.stringify(overrides));
  const result = spawnSync('bash', ['-c', step.inputs.script], {
    cwd: artifact,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...pipeline.variables,
      APP_COMMIT_ID: 'app-commit',
      APP_ENVIRONMENT: environment,
      HAS_CUSTOM_INGRESS_ROUTES: customIngress ? 'true' : 'false',
    },
  });
  const release = JSON.parse(
    execFileSync('yq', ['-o=json', '.', join(artifact, pipeline.variables.HELMRELEASE_FILE)]),
  );
  return { ...result, values: release.spec.values };
}

function successful(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.values;
}

for (const nested of [false, true]) {
  test(`missing environment file preserves ${nested ? 'nested' : 'flat'} shared values`, (t) => {
    const values = { replicaCount: 2, resources: { requests: { cpu: '50m' } } };
    assert.deepEqual(
      successful(deploy(t, { 'values.yaml': nested ? { deployment: values } : values })),
      values,
    );
  });
}

test('missing both files leaves platform overrides intact', (t) => {
  const overrides = { image: { tag: 'release' } };
  assert.deepEqual(successful(deploy(t, {}, 'tt02', overrides)), overrides);
});

for (const sharedNested of [false, true]) {
  for (const environmentNested of [false, true]) {
    test(`merge precedence with shared nested=${sharedNested}, environment nested=${environmentNested}`, (t) => {
      const shared = {
        replicaCount: 2,
        autoscaling: { enabled: true, replicas: { min: 2, max: 6 } },
        image: { tag: 'shared', environment: [{ name: 'SHARED', value: 'yes' }] },
        volumes: [{ name: 'shared' }],
      };
      const overlay = {
        replicaCount: 1,
        autoscaling: { replicas: { min: 1 } },
        image: { tag: 'environment', environment: [{ name: 'ENVIRONMENT', value: 'yes' }] },
        volumes: [{ name: 'environment' }],
      };
      const overrides = {
        image: { tag: 'platform', environment: [{ name: 'PLATFORM', value: 'yes' }] },
      };
      const values = successful(
        deploy(
          t,
          {
            'values.yaml': sharedNested ? { deployment: shared } : shared,
            'values.tt02.yaml': environmentNested ? { deployment: overlay } : overlay,
          },
          'tt02',
          overrides,
        ),
      );
      assert.deepEqual(values, {
        replicaCount: 1,
        autoscaling: { enabled: true, replicas: { min: 1, max: 6 } },
        image: overrides.image,
        volumes: overlay.volumes,
      });
    });
  }
}

test('only the target environment file is loaded, including production', (t) => {
  const files = {
    'values.yaml': { deployment: { replicaCount: 2 } },
    'values.tt02.yaml': { deployment: { replicaCount: 1 } },
    'values.production.yaml': { deployment: { replicaCount: 3 } },
    'values.at24.yaml': 'invalid: [',
  };
  assert.equal(successful(deploy(t, files, 'tt02')).replicaCount, 1);
  assert.equal(successful(deploy(t, files, 'production')).replicaCount, 3);
  assert.equal(successful(deploy(t, files, 'yt01')).replicaCount, 2);
});

test('an environment file works without shared values', (t) => {
  assert.deepEqual(
    successful(deploy(t, { 'values.tt02.yaml': { deployment: { replicaCount: 1 } } })),
    { replicaCount: 1 },
  );
});

test('empty environment file preserves shared values', (t) => {
  assert.deepEqual(
    successful(
      deploy(t, { 'values.yaml': { replicaCount: 2 }, 'values.tt02.yaml': '# no overrides\n' }),
    ),
    { replicaCount: 2 },
  );
});

test('platform routing and existing custom ingress handling keep their precedence', (t) => {
  const overrides = {
    service: { name: 'platform-service' },
    ingressRoute: { name: 'platform-route' },
  };
  const customIngress = [{ name: 'custom-route', routes: [] }];
  const values = successful(
    deploy(
      t,
      {
        'values.tt02.yaml': {
          deployment: {
            service: { name: 'app-service', internalPort: 5005 },
            ingressRoute: { name: 'app-route' },
            customIngressRoutes: [{ name: 'app-custom-route' }],
          },
        },
      },
      'tt02',
      overrides,
      customIngress,
    ),
  );
  assert.deepEqual(values, {
    service: { name: 'platform-service', internalPort: 5005 },
    ingressRoute: overrides.ingressRoute,
    customIngressRoutes: customIngress,
  });
});

test('root-level keys still take precedence over nested deployment keys', (t) => {
  assert.equal(
    successful(deploy(t, { 'values.yaml': { deployment: { replicaCount: 2 }, replicaCount: 4 } }))
      .replicaCount,
    4,
  );
});

for (const contents of [
  'replicaCount: [',
  '- not-a-mapping',
  'replicaCount: 1\n---\nreplicaCount: 2',
]) {
  test(`invalid environment values: ${JSON.stringify(contents)} fails before publishing values`, (t) => {
    const result = deploy(t, { 'values.tt02.yaml': contents });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Expected a single YAML mapping/);
    assert.deepEqual(result.values, {});
  });
}

test('environment normalization errors fail before publishing values', (t) => {
  const result = deploy(t, { 'values.tt02.yaml': { deployment: 'not-a-mapping' } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Could not normalize environment values/);
  assert.deepEqual(result.values, {});
});

test('multiple shared YAML documents retain the existing merge behavior', (t) => {
  assert.deepEqual(
    successful(deploy(t, { 'values.yaml': 'replicaCount: 1\n---\nreplicaCount: 2' })),
    { replicaCount: 2 },
  );
});

test('malformed shared YAML retains the existing non-fatal error behavior', (t) => {
  const result = deploy(t, { 'values.yaml': 'replicaCount: [' });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Error/);
  assert.doesNotMatch(result.stderr, /Expected a single YAML mapping/);
});

test('reject environment names containing path separators', (t) => {
  const result = deploy(t, {}, '../production');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Invalid environment name/);
});
