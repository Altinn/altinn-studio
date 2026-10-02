#!/usr/bin/env node
/**
 * Presenter walkthrough — drive the built deck with the right-arrow key exactly
 * as a presenter would and photograph every state it passes through.
 *
 *   npm run walkthrough            # build, then shots/walkthrough/000.png …
 *   node scripts/walkthrough.mjs   # capture from an existing dist/
 *
 * Unlike `screenshot.mjs` (which deep-links each slide and disables animations)
 * this one never touches the hash: it presses `→`, waits for the animation to
 * settle the way a room full of people would see it, and shoots. That is what
 * catches sims that do not reset, reveals that land on top of each other, and
 * text that only overflows once a build step has run.
 *
 * Flags:
 *   --url <http://...>  capture a server that is already running
 *   --out <dir>         output directory (default: shots/walkthrough)
 *   --port <n>          port for the spawned `vite preview` (default: 4173)
 *   --dwell <ms>        wait per state before the shutter (default: 2500)
 *   --no-reverse        skip the backwards (`←`) pass
 */
import { spawn } from 'node:child_process';
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIEWPORT = { width: 1920, height: 1080 };
const READY_TIMEOUT_MS = 20_000;

function parseArgs(argv) {
  const args = { url: null, out: 'shots/walkthrough', port: 4173, dwell: 2500, reverse: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--dwell') args.dwell = Number(argv[++i]);
    else if (a === '--no-reverse') args.reverse = false;
  }
  return args;
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function startPreview(port) {
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('dist/index.html is missing — run `npm run build` first');
  }
  const child = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', '--silent', 'preview', '--', '--port', String(port), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

  const url = `http://localhost:${port}/`;
  if (!(await waitForServer(url))) {
    child.kill('SIGTERM');
    throw new Error(`vite preview did not come up on ${url}`);
  }
  return { child, url };
}

const position = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-deck-root]');
    return {
      index: Number(el.getAttribute('data-slide-index')),
      step: Number(el.getAttribute('data-slide-step')),
      id: el.getAttribute('data-slide-id'),
    };
  });

const settled = (page) =>
  page.waitForFunction(
    () => document.querySelector('[data-deck-root]')?.getAttribute('data-transitioning') === 'false',
    undefined,
    { timeout: READY_TIMEOUT_MS },
  );

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(ROOT, args.out);

  let server = null;
  let baseUrl = args.url;
  if (!baseUrl) {
    server = await startPreview(args.port);
    baseUrl = server.url;
  }

  await mkdir(outDir, { recursive: true });
  for (const f of await readdir(outDir).catch(() => [])) {
    if (/\.png$/.test(f)) await rm(path.join(outDir, f));
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const manifest = [];
  let n = 0;
  const shoot = async (meta) => {
    const file = `${String(n).padStart(3, '0')}.png`;
    await page.screenshot({ path: path.join(outDir, file) });
    manifest.push({ n, file, ...meta });
    process.stdout.write(`  ✓ ${file}  ${meta.id ?? ''} step ${meta.step ?? '-'}${meta.note ? `  (${meta.note})` : ''}\n`);
    n++;
  };

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-deck-root]', { timeout: READY_TIMEOUT_MS });
    await page.evaluate(() => document.fonts.ready);
    await settled(page);

    // ---- forward pass: every state, in presenting order ----
    const forward = [];
    for (let guard = 0; guard < 300; guard++) {
      await page.waitForTimeout(args.dwell);
      const at = await position(page);
      forward.push(`${at.index}/${at.step}`);
      await shoot({ ...at, pass: 'forward' });

      await page.keyboard.press('ArrowRight');
      await settled(page);
      const now = await position(page);
      if (now.index === at.index && now.step === at.step) break; // parked at the end
    }

    // ---- overlays, from the last slide ----
    await page.keyboard.press('o');
    await page.waitForTimeout(600);
    await shoot({ id: 'overlay-overview', pass: 'overlay', note: 'o — overview grid' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await page.keyboard.press('?');
    await page.waitForTimeout(600);
    await shoot({ id: 'overlay-help', pass: 'overlay', note: '? — help' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const overlaysClosed = await page.evaluate(
      () => !document.querySelector('.overview') && !document.querySelector('.help__panel'),
    );
    if (!overlaysClosed) errors.push('Escape did not close an overlay');

    // `f` cannot open real fullscreen in headless chromium, but the handler
    // must still run without throwing and must not move the deck.
    const before = await position(page);
    await page.keyboard.press('f');
    await page.waitForTimeout(400);
    const after = await position(page);
    if (before.index !== after.index || before.step !== after.step) {
      errors.push('pressing f moved the deck');
    }

    // ---- backward pass: ← through every state, to catch sims that keep state ----
    if (args.reverse) {
      const backward = [];
      for (let guard = 0; guard < 300; guard++) {
        await page.waitForTimeout(args.dwell);
        const at = await position(page);
        backward.push(`${at.index}/${at.step}`);
        await shoot({ ...at, pass: 'backward' });
        if (at.index === 0 && at.step === 0) break;
        await page.keyboard.press('ArrowLeft');
        await settled(page);
      }

      const expected = [...forward].reverse();
      if (backward.join(',') !== expected.join(',')) {
        errors.push(
          `backward pass did not mirror the forward pass\n    forward: ${expected.join(' ')}\n    backward: ${backward.join(' ')}`,
        );
      }
    }

    await writeFile(
      path.join(outDir, 'manifest.json'),
      `${JSON.stringify(
        { viewport: VIEWPORT, dwellMs: args.dwell, capturedAt: new Date().toISOString(), shots: manifest },
        null,
        2,
      )}\n`,
      'utf8',
    );
  } finally {
    await context.close();
    await browser.close();
    if (server) server.child.kill('SIGTERM');
  }

  process.stdout.write(`\n${manifest.length} state(s) -> ${path.relative(ROOT, outDir)}/\n`);

  if (errors.length) {
    process.stderr.write(`\nProblems during the walkthrough:\n${errors.map((e) => `  - ${e}`).join('\n')}\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
