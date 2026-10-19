import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const validator = fileURLToPath(new URL('./agents-docs-validate.mjs', import.meta.url));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-docs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  write('AGENTS.md', '# Repository\n\nCode lives in src.\n');
  write('src/.gitkeep', '');
  write('.gitignore', '**/CLAUDE.md\n');
  git('init');
  git('add', 'AGENTS.md', 'src/.gitkeep', '.gitignore');
  git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-m',
    'Initialize fixture',
  );
  const run = () => spawnSync(process.execPath, [validator], { cwd: root, encoding: 'utf8' });
  return { root, git, write, run };
}

test('generates ignored imports for root and new nested guidance without changing AGENTS.md', (t) => {
  const { root, git, write, run } = fixture(t);
  const guidance = '# Feature\n\nFollow the feature boundary.\n';
  write('src/custom/feature/AGENTS.md', guidance);
  assert.equal(run().status, 0);
  const generated = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  assert.match(generated, /\n@AGENTS\.md\n$/);
  assert.equal(fs.readFileSync(path.join(root, 'src/custom/feature/CLAUDE.md'), 'utf8'), generated);
  assert.equal(fs.readFileSync(path.join(root, 'src/custom/feature/AGENTS.md'), 'utf8'), guidance);
  assert.equal(
    git('check-ignore', 'CLAUDE.md', 'src/custom/feature/CLAUDE.md').toString().trim().split('\n')
      .length,
    2,
  );
  assert.equal(run().status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), generated);
});

test('recreates a missing generated import', (t) => {
  const { root, run } = fixture(t);
  assert.equal(run().status, 0);
  fs.unlinkSync(path.join(root, 'CLAUDE.md'));
  assert.equal(run().status, 0);
  assert.match(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), /\n@AGENTS\.md\n$/);
});

test('rejects manually authored guidance without overwriting it', (t) => {
  const { root, write, run } = fixture(t);
  const authored = '# Separate instructions\n';
  write('CLAUDE.md', authored);
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /move guidance to AGENTS\.md/);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), authored);
});

for (const directory of ['src/custom/feature', 'src/App/frontend/src/core/queries']) {
  test(`rejects tracked CLAUDE.md even with generated contents in ${directory}`, (t) => {
    const { git, write, run } = fixture(t);
    write(`${directory}/AGENTS.md`, '# Feature\n');
    assert.equal(run().status, 0);
    git('add', '-f', `${directory}/CLAUDE.md`);
    const result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /keep CLAUDE\.md untracked/);
  });
}

test('still rejects broken guidance links', (t) => {
  const { write, run } = fixture(t);
  write('AGENTS.md', '# Repository\n\nCode lives in src. Read [missing](missing.md).\n');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /broken link "missing\.md"/);
});

test('still requires tracked directories in the root map', (t) => {
  const { write, run } = fixture(t);
  write('AGENTS.md', '# Repository\n');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tracked directory "src" is not mentioned/);
});
