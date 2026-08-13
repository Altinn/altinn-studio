import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const actionPattern = /\buses:\s*([\w.-]+\/[\w.-]+(?:\/[\w./-]+)?)@([0-9a-f]{40})\b/i;
const containerPattern = /([^\s"'=@]+)@(sha256:[0-9a-f]{64})\b/i;

function parseContainerReference(reference) {
  const lastSlash = reference.lastIndexOf('/');
  const lastColon = reference.lastIndexOf(':');
  const repository = lastColon > lastSlash ? reference.slice(0, lastColon) : reference;
  return { repository, reference };
}

function parseDigest(line) {
  const action = line.match(actionPattern);
  if (action) {
    return {
      type: 'GitHub Action',
      artifact: action[1],
      reference: action[1],
      digest: action[2],
    };
  }

  const container = line.match(containerPattern);
  if (container) {
    const { repository, reference } = parseContainerReference(container[1]);
    return {
      type: 'Container',
      artifact: repository,
      reference,
      digest: container[2],
    };
  }

  return undefined;
}

export function collectDigestChanges(diff) {
  let file;
  const removed = new Map();
  const added = new Map();

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6);
      continue;
    }
    if (!file || line.startsWith('---') || line.startsWith('+++')) continue;

    const direction = line[0];
    if (direction !== '+' && direction !== '-') continue;

    const digest = parseDigest(line.slice(1));
    if (!digest) continue;

    const target = direction === '+' ? added : removed;
    const key = `${file}\0${digest.type}\0${digest.artifact}`;
    const entries = target.get(key) ?? [];
    entries.push({ ...digest, file });
    target.set(key, entries);
  }

  const changes = [];
  for (const key of new Set([...removed.keys(), ...added.keys()])) {
    const oldEntries = removed.get(key) ?? [];
    const newEntries = added.get(key) ?? [];
    const pairedEntries = Math.min(oldEntries.length, newEntries.length);
    for (let index = 0; index < pairedEntries; index += 1) {
      const oldEntry = oldEntries[index];
      const newEntry = newEntries[index];
      if (oldEntry.digest === newEntry.digest && oldEntry.reference === newEntry.reference)
        continue;
      changes.push({
        type: oldEntry.type,
        artifact: oldEntry.artifact,
        oldReference: oldEntry.reference,
        oldDigest: oldEntry.digest,
        newReference: newEntry.reference,
        newDigest: newEntry.digest,
        files: [oldEntry.file],
      });
    }
    for (const oldEntry of oldEntries.slice(pairedEntries)) {
      changes.push({
        type: oldEntry.type,
        artifact: oldEntry.artifact,
        oldReference: oldEntry.reference,
        oldDigest: oldEntry.digest,
        files: [oldEntry.file],
      });
    }
    for (const newEntry of newEntries.slice(pairedEntries)) {
      changes.push({
        type: newEntry.type,
        artifact: newEntry.artifact,
        newReference: newEntry.reference,
        newDigest: newEntry.digest,
        files: [newEntry.file],
      });
    }
  }

  const consolidated = new Map();
  for (const change of changes) {
    const key = [
      change.type,
      change.artifact,
      change.oldReference,
      change.oldDigest,
      change.newReference,
      change.newDigest,
    ].join('\0');
    const existing = consolidated.get(key);
    if (existing) {
      existing.files.push(...change.files);
    } else {
      consolidated.set(key, change);
    }
  }

  return [...consolidated.values()].sort((left, right) =>
    `${left.type}:${left.artifact}`.localeCompare(`${right.type}:${right.artifact}`),
  );
}

function escapeCell(value) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function shortDigest(digest) {
  return digest.startsWith('sha256:') ? `sha256:${digest.slice(7, 19)}` : digest.slice(0, 12);
}

function evidence(change) {
  if (change.type !== 'GitHub Action') return 'Inspect registry metadata, provenance, and SBOM';
  const [owner, repository] = change.artifact.split('/');
  if (change.oldDigest && change.newDigest) {
    const url = `https://github.com/${owner}/${repository}/compare/${change.oldDigest}...${change.newDigest}`;
    return `[compare commits and files](${url})`;
  }
  const digest = change.newDigest ?? change.oldDigest;
  return `[inspect pinned commit](https://github.com/${owner}/${repository}/commit/${digest})`;
}

export function renderDigestAudit(changes) {
  const lines = [
    '# Dependency digest audit context',
    '',
    'This report makes opaque digest changes explicit. It supplies review context; it never approves or merges an update.',
    '',
  ];

  if (changes.length === 0) {
    lines.push('No changed dependency digests were found.', '');
    return lines.join('\n');
  }

  lines.push('| Artifact | Pinned change | Files | Evidence |', '| --- | --- | --- | --- |');
  for (const change of changes) {
    const oldValue = change.oldDigest
      ? `${change.oldReference}@${shortDigest(change.oldDigest)}`
      : 'not pinned';
    const newValue = change.newDigest
      ? `${change.newReference}@${shortDigest(change.newDigest)}`
      : 'not pinned';
    const files = [...new Set(change.files)]
      .sort()
      .map((file) => `\`${file}\``)
      .join('<br>');
    lines.push(
      `| ${escapeCell(change.artifact)} | \`${escapeCell(oldValue)}\` → \`${escapeCell(newValue)}\` | ${files} | ${evidence(change)} |`,
    );
  }

  lines.push(
    '',
    '## Review checklist',
    '',
    '- Confirm that every digest still belongs to the expected tag and publisher.',
    '- Review upstream release notes, commits, and changed files between the old and new revisions.',
    '- For containers, inspect registry provenance/SBOM data and the vulnerability delta.',
    '- Check that the update does not cross an unexpected package, image, or release boundary.',
    '- Record the audit conclusion in the pull request before human approval.',
    '',
  );
  return lines.join('\n');
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    options[arguments_[index]] = arguments_[index + 1];
  }
  if (!options['--base'] || !options['--head']) {
    throw new Error(
      'Usage: dependency-digest-audit.mjs --base <sha> --head <sha> [--output <path>]',
    );
  }
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const diff = execFileSync(
    'git',
    ['diff', '--unified=0', options['--base'], options['--head'], '--'],
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
  );
  const report = renderDigestAudit(collectDigestChanges(diff));
  if (options['--output']) {
    writeFileSync(options['--output'], report);
  } else {
    process.stdout.write(report);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
