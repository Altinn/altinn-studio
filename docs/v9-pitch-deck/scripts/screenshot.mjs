#!/usr/bin/env node
/**
 * Capture every slide of the built deck at 1920x1080.
 *
 *   npm run shots                 # build, then capture shots/slide-NN.png
 *   node scripts/screenshot.mjs   # capture from an existing dist/
 *
 * Flags:
 *   --steps              also capture each build step (slide-NN-step-M.png)
 *   --url <http://...>   capture a server that is already running (e.g. `npm run dev`)
 *   --out <dir>          output directory (default: shots)
 *   --port <n>           port for the spawned `vite preview` (default: 4173)
 *
 * A later QA agent reads shots/manifest.json to map files back to slide ids.
 */
import { spawn } from 'node:child_process';
import { mkdir, rm, readdir, writeFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORT = { width: 1920, height: 1080 };
const NAV_TIMEOUT_MS = 30_000;
const READY_TIMEOUT_MS = 20_000;
/** Let reveal/step animations finish before the shutter. */
const SETTLE_MS = 450;
/**
 * A simulation slide plays itself for ~16 s, and `animations: 'disabled'` does
 * not touch it: the scene is driven by a timer, not by CSS. Waiting for the run
 * to park is what makes this capture deterministic — without it the shutter
 * lands on whichever beat happened to be on screen 450 ms after arrival, so the
 * "deterministic" mode produced a different picture on every run.
 */
const SIM_DONE_TIMEOUT_MS = 25_000;

function parseArgs(argv) {
  const args = { steps: false, url: null, out: 'shots', port: 4173 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--steps') args.steps = true;
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--port') args.port = Number(argv[++i]);
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
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (!existsSync(distIndex)) {
    throw new Error(`dist/index.html is missing — run \`npm run build\` first (looked in ${distIndex})`);
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

/**
 * Read the registry without importing TSX into node: the built bundle already
 * holds it, so ask the running page instead. Falls back to walking the deck.
 */
async function readRegistry(page) {
  return page.evaluate(async () => {
    const root = document.querySelector('[data-deck-root]');
    if (!root) throw new Error('deck root not found — did the app fail to mount?');
    // Drive the deck to the end to learn the slide count from the counter.
    const totalEl = document.querySelector('.deck-progress__count-total');
    const total = totalEl ? Number(totalEl.textContent) : 0;
    return { total };
  });
}

/**
 * If the slide on stage holds a self-playing simulation, wait for it to park on
 * its end state. Slides without one return immediately.
 */
async function settleSimulation(page) {
  const hasSim = await page.evaluate(() => Boolean(document.querySelector('.deck__slide .sim')));
  if (!hasSim) return;
  await page.waitForFunction(
    () => document.querySelector('.deck__slide .sim')?.getAttribute('data-done') === 'true',
    undefined,
    { timeout: SIM_DONE_TIMEOUT_MS },
  );
}

async function gotoSlide(page, index, step) {
  const hash = step > 0 ? `#/${index + 1}/${step}` : `#/${index + 1}`;
  await page.evaluate((h) => {
    if (window.location.hash === h) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = h;
    }
  }, hash);

  await page.waitForFunction(
    ({ i, s }) => {
      const el = document.querySelector('[data-deck-root]');
      if (!el) return false;
      return (
        el.getAttribute('data-slide-index') === String(i) &&
        el.getAttribute('data-slide-step') === String(s) &&
        el.getAttribute('data-transitioning') === 'false'
      );
    },
    { i: index, s: step },
    { timeout: READY_TIMEOUT_MS },
  );

  await settleSimulation(page);
  await page.waitForTimeout(SETTLE_MS);
}

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
  // Clear stale shots so a removed slide cannot leave a ghost behind.
  for (const f of await readdir(outDir).catch(() => [])) {
    if (/^slide-\d+.*\.png$/.test(f)) await rm(path.join(outDir, f));
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const manifest = [];
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-deck-root]', { timeout: READY_TIMEOUT_MS });
    await page.evaluate(() => document.fonts.ready);

    const { total } = await readRegistry(page);
    if (!Number.isFinite(total) || total < 1) throw new Error('could not read the slide count');

    for (let i = 0; i < total; i++) {
      await gotoSlide(page, i, 0);

      const id = await page.getAttribute('[data-deck-root]', 'data-slide-id');
      const num = String(i + 1).padStart(2, '0');
      const file = `slide-${num}.png`;
      await page.screenshot({ path: path.join(outDir, file), animations: 'disabled' });
      manifest.push({ index: i, number: num, id, step: 0, file, hash: `#/${i + 1}` });
      process.stdout.write(`  ✓ ${file}  ${id}\n`);

      if (!args.steps) continue;

      // Walk the build steps by pressing → until the slide changes, or until
      // the step stops advancing (the deck is parked on the final slide).
      let prevStep = 0;
      for (let s = 1; s < 40; s++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(120);
        const nowIndex = Number(await page.getAttribute('[data-deck-root]', 'data-slide-index'));
        const nowStep = Number(await page.getAttribute('[data-deck-root]', 'data-slide-step'));
        if (nowIndex !== i || nowStep === prevStep) break;
        prevStep = nowStep;
        await page.waitForTimeout(SETTLE_MS);
        const stepFile = `slide-${num}-step-${nowStep}.png`;
        await page.screenshot({ path: path.join(outDir, stepFile), animations: 'disabled' });
        manifest.push({ index: i, number: num, id, step: nowStep, file: stepFile, hash: `#/${i + 1}/${nowStep}` });
        process.stdout.write(`  ✓ ${stepFile}\n`);
      }
    }

    await writeFile(
      path.join(outDir, 'manifest.json'),
      `${JSON.stringify({ viewport: VIEWPORT, capturedAt: new Date().toISOString(), shots: manifest }, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await context.close();
    await browser.close();
    if (server) server.child.kill('SIGTERM');
  }

  await access(path.join(outDir, 'manifest.json'));
  process.stdout.write(`\n${manifest.length} screenshot(s) -> ${path.relative(ROOT, outDir)}/\n`);

  if (errors.length) {
    process.stderr.write(`\nPage errors during capture:\n${errors.map((e) => `  - ${e}`).join('\n')}\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
