#!/usr/bin/env node
/**
 * Photograph each simulation *while it autoplays*, at 1920x1080.
 *
 * The simulations are not stepped: they run themselves for ~15 s. So the
 * capture is a film strip — load the harness once per simulation and fire the
 * shutter every `--every` ms until the run parks, which is what catches a row
 * that overflows its pane three phases in.
 *
 *   node scripts/sim-shots.mjs                              # spawns `vite dev`
 *   node scripts/sim-shots.mjs --url http://localhost:5173  # use a running server
 *
 * Flags:
 *   --url <http://...>  a dev/preview server that is already running
 *   --out <dir>         output directory (default: shots/sims)
 *   --port <n>          port for the spawned dev server (default: 5199)
 *   --sim <key>         only this simulation (innbygger | mottaker | drift)
 *   --every <ms>        gap between frames (default: 2000)
 *   --span <ms>         how long to follow a run (default: 20000)
 *
 * Files are `<sim>-t<seconds>.png`, plus `<sim>-end.png` once the run reports
 * `data-done="true"`. Exits non-zero if the page logged a console error, so it
 * doubles as a smoke test for the simulations.
 */
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORT = { width: 1920, height: 1080 };
const SIMS = ['innbygger', 'mottaker', 'drift'];

function parseArgs(argv) {
  const args = { url: null, out: 'shots/sims', port: 5199, sim: null, every: 2000, span: 20_000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--sim') args.sim = argv[++i];
    else if (a === '--every') args.every = Number(argv[++i]);
    else if (a === '--span') args.span = Number(argv[++i]);
  }
  return args;
}

async function waitForServer(url, timeoutMs = 40_000) {
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

function startDev(port) {
  const child = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}

/** The run's own state, straight off the data attributes on `.sim`. */
async function runState(slide) {
  return slide.evaluate((el) => {
    const sim = el.querySelector('.sim');
    return {
      cursor: Number(sim?.getAttribute('data-cursor') ?? -1),
      done: sim?.getAttribute('data-done') === 'true',
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(ROOT, args.out);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  let server = null;
  let base = args.url;
  if (!base) {
    server = startDev(args.port);
    base = `http://localhost:${args.port}`;
  }

  const ok = await waitForServer(base);
  if (!ok) {
    server?.kill();
    throw new Error(`Server never came up at ${base}`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  const manifest = [];
  const keys = args.sim ? [args.sim] : SIMS;

  for (const sim of keys) {
    const url = `${base}/?sim=${sim}&chrome=0`;
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    const slide = page.locator('[data-harness-slide]');
    await slide.waitFor({ state: 'visible', timeout: 20_000 });

    const started = Date.now();
    let ended = false;

    for (let t = 0; t <= args.span && !ended; t += args.every) {
      const wait = started + t - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);

      const state = await runState(slide);
      const file = `${sim}-t${String(Math.round(t / 1000)).padStart(2, '0')}.png`;
      await slide.screenshot({ path: path.join(outDir, file) });
      manifest.push({ sim, at: t, file, url, ...state });
      process.stdout.write(`  ${file}  ${state.cursor} rader${state.done ? ' · ferdig' : ''}\n`);
      ended = state.done;
    }

    // The parked end state, settled: pills in, list scrolled to the last row.
    await page.waitForTimeout(1200);
    const endState = await runState(slide);
    const endFile = `${sim}-end.png`;
    await slide.screenshot({ path: path.join(outDir, endFile) });
    manifest.push({ sim, at: 'end', file: endFile, url, ...endState });
    process.stdout.write(`  ${endFile}  ${endState.cursor} rader${endState.done ? ' · ferdig' : ''}\n`);

    if (!endState.done) {
      errors.push(`${sim}: run had not finished after ${args.span} ms (cursor ${endState.cursor})`);
    }
  }

  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await browser.close();
  server?.kill();

  if (errors.length > 0) {
    console.error('\nProblems while capturing:');
    for (const e of errors) console.error('  ' + e);
    process.exitCode = 1;
    return;
  }
  console.log(`\n${manifest.length} shots → ${path.relative(ROOT, outDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
