#!/usr/bin/env node
/**
 * British-English spell check for customer-facing UI text.
 *
 * Translation files mix two languages of their own:
 *
 *   "app_deployment.no_env_title": "Your organisation has not ordered access"
 *    ^^^^^^^^^^^^^^^^^^^^^^^^^^^ key: code contract, US English
 *                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ value: en-GB
 *
 * Running `typos --locale en-gb` over the raw file therefore reports every
 * correctly-spelled key ("organization_lookup.*", "authorization_*") as an
 * error, and a naive --write-changes would rewrite the keys and silently
 * break every lookup.
 *
 * So we blank out the key portion of each line, keeping byte offsets and line
 * numbers intact, and spell-check that masked copy instead. Findings map
 * straight back onto the real file.
 *
 * Usage:
 *   node .github/scripts/spellcheck-ui-text.mjs                  # check (needs typos on PATH)
 *   node .github/scripts/spellcheck-ui-text.mjs --write          # apply fixes
 *   node .github/scripts/spellcheck-ui-text.mjs --emit-masked D  # write masked copies to D
 *
 * CI uses --emit-masked and then points the pinned crate-ci/typos action at
 * that directory, so the workflow needs no extra tool-install action.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename, dirname } from 'node:path';

/** English UI-text files. Keep in sync with the excludes in typos.toml. */
const FILES = [
  'src/Designer/frontend/language/src/en.json',
  'src/Designer/frontend/resourceadm/language/src/en.json',
  'app-libs/language/src/texts/en.ts',
];

const CONFIG = 'typos.en-gb.toml';
const write = process.argv.includes('--write');
const emitIdx = process.argv.indexOf('--emit-masked');
const emitDir = emitIdx === -1 ? null : process.argv[emitIdx + 1];

/** Matches a leading `"key":` / `'key':` and returns how many bytes it spans. */
const KEY_RE = /^\s*(['"])(?:\\.|(?!\1)[^\\])*\1\s*:/;

/** Replace the key span with spaces so offsets and line numbers are preserved. */
function maskKeys(source) {
  return source
    .split('\n')
    .map((line) => {
      const m = KEY_RE.exec(line);
      return m ? ' '.repeat(m[0].length) + line.slice(m[0].length) : line;
    })
    .join('\n');
}

function runTypos(args) {
  const res = spawnSync('typos', args, { encoding: 'utf8' });
  if (res.error) {
    console.error(
      `Could not run "typos": ${res.error.message}\n` +
        'Install it with `brew install typos-cli` or `cargo install typos-cli`.',
    );
    process.exit(127);
  }
  return res;
}

// CI path: just materialize masked copies at the same relative paths, so the
// pinned crate-ci/typos action can check them and report recognizable names.
if (emitDir) {
  for (const file of FILES) {
    const out = join(emitDir, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, maskKeys(readFileSync(file, 'utf8')));
  }
  console.log(`Wrote ${FILES.length} masked UI-text file(s) to ${emitDir}`);
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), 'spellcheck-ui-'));
let failed = false;

try {
  for (const file of FILES) {
    const original = readFileSync(file, 'utf8');
    const masked = join(tmp, basename(file));
    writeFileSync(masked, maskKeys(original));

    const res = runTypos(['--config', CONFIG, '--format', 'json', masked]);
    const findings = res.stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .filter((f) => f.type === 'typo');

    if (findings.length === 0) continue;

    if (!write) {
      failed = true;
      for (const f of findings) {
        console.log(
          `${file}:${f.line_num}:${f.byte_offset + 1}: error: \`${f.typo}\` should be \`${f.corrections.join('` or `')}\``,
        );
      }
      continue;
    }

    // Apply single-correction fixes back onto the real file, right-to-left per
    // line so earlier offsets stay valid.
    const lines = original.split('\n');
    const byLine = new Map();
    for (const f of findings) {
      if (f.corrections.length !== 1) {
        failed = true;
        console.log(
          `${file}:${f.line_num}: ambiguous, fix by hand: \`${f.typo}\` -> ${f.corrections.join(' | ')}`,
        );
        continue;
      }
      if (!byLine.has(f.line_num)) byLine.set(f.line_num, []);
      byLine.get(f.line_num).push(f);
    }

    let applied = 0;
    for (const [lineNum, items] of byLine) {
      let line = lines[lineNum - 1];
      for (const f of items.sort((a, b) => b.byte_offset - a.byte_offset)) {
        const { byte_offset: off, typo } = f;
        if (line.slice(off, off + typo.length) !== typo) continue;
        let fix = f.corrections[0];
        if (typo[0] === typo[0].toUpperCase()) fix = fix[0].toUpperCase() + fix.slice(1);
        line = line.slice(0, off) + fix + line.slice(off + typo.length);
        applied += 1;
      }
      lines[lineNum - 1] = line;
    }
    writeFileSync(file, lines.join('\n'));
    console.log(`${file}: applied ${applied} fix(es)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) {
  if (!write) {
    console.log(
      '\nCustomer-facing UI text is British English. Run `yarn spell:fix:en-gb` to apply,\n' +
        'or add a genuine exception to typos.en-gb.toml.',
    );
  }
  process.exit(1);
}

if (!write) console.log('UI text spelling OK');
