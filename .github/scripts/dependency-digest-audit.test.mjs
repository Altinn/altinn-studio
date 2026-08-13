import assert from 'node:assert/strict';
import test from 'node:test';

import { collectDigestChanges, renderDigestAudit } from './dependency-digest-audit.mjs';

const oldContainerDigest = `sha256:${'1'.repeat(64)}`;
const newContainerDigest = `sha256:${'2'.repeat(64)}`;
const oldActionDigest = '3'.repeat(40);
const newActionDigest = '4'.repeat(40);

test('consolidates the same container digest change across files', () => {
  const diff = [
    'diff --git a/Dockerfile b/Dockerfile',
    '--- a/Dockerfile',
    '+++ b/Dockerfile',
    `-FROM golang:1.26.4@${oldContainerDigest}`,
    `+FROM golang:1.26.5@${newContainerDigest}`,
    'diff --git a/src/Runtime/pdf3/Dockerfile b/src/Runtime/pdf3/Dockerfile',
    '--- a/src/Runtime/pdf3/Dockerfile',
    '+++ b/src/Runtime/pdf3/Dockerfile',
    `-FROM golang:1.26.4@${oldContainerDigest}`,
    `+FROM golang:1.26.5@${newContainerDigest}`,
  ].join('\n');

  const changes = collectDigestChanges(diff);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].artifact, 'golang');
  assert.deepEqual(changes[0].files, ['Dockerfile', 'src/Runtime/pdf3/Dockerfile']);
  assert.equal(changes[0].oldReference, 'golang:1.26.4');
  assert.equal(changes[0].newReference, 'golang:1.26.5');
});

test('links GitHub Action updates to the exact commit comparison', () => {
  const diff = [
    'diff --git a/.github/workflows/test.yml b/.github/workflows/test.yml',
    '--- a/.github/workflows/test.yml',
    '+++ b/.github/workflows/test.yml',
    `-      - uses: actions/checkout@${oldActionDigest} # v7.0.0`,
    `+      - uses: actions/checkout@${newActionDigest} # v7.0.1`,
  ].join('\n');

  const report = renderDigestAudit(collectDigestChanges(diff));

  assert.match(report, /actions\/checkout/);
  assert.match(
    report,
    new RegExp(
      `github\\.com/actions/checkout/compare/${oldActionDigest}\\.\\.\\.${newActionDigest}`,
    ),
  );
  assert.match(report, /never approves or merges/);
});

test('reports when a pull request has no digest updates', () => {
  assert.match(renderDigestAudit([]), /No changed dependency digests were found/);
});

test('reports an initial digest pin even when the old line had no digest', () => {
  const diff = [
    'diff --git a/Dockerfile b/Dockerfile',
    '--- a/Dockerfile',
    '+++ b/Dockerfile',
    '-FROM golang:1.26.5',
    `+FROM golang:1.26.5@${newContainerDigest}`,
  ].join('\n');

  const report = renderDigestAudit(collectDigestChanges(diff));

  assert.match(report, /not pinned/);
  assert.match(report, /golang:1\.26\.5@sha256:/);
});

test('reports removed pins and artifact replacements instead of silently dropping them', () => {
  const diff = [
    'diff --git a/.github/workflows/test.yml b/.github/workflows/test.yml',
    '--- a/.github/workflows/test.yml',
    '+++ b/.github/workflows/test.yml',
    `-      - uses: actions/checkout@${oldActionDigest}`,
    `+      - uses: actions/setup-node@${newActionDigest}`,
    'diff --git a/Dockerfile b/Dockerfile',
    '--- a/Dockerfile',
    '+++ b/Dockerfile',
    `-FROM golang:1.26.5@${oldContainerDigest}`,
    '+FROM golang:1.26.5',
  ].join('\n');

  const changes = collectDigestChanges(diff);
  const report = renderDigestAudit(changes);

  assert.equal(changes.length, 3);
  assert.match(report, /actions\/checkout/);
  assert.match(report, /actions\/setup-node/);
  assert.match(report, /golang/);
  assert.match(report, /not pinned/);
});
