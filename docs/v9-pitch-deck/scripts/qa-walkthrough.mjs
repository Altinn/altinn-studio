#!/usr/bin/env node
/**
 * Integration QA pass — the combined walkthrough.
 *
 * Drives the built deck exactly as a presenter would (`→` only, never the hash)
 * and photographs every state, but unlike `walkthrough.mjs` it also gives the
 * three autoplaying simulations the time they actually take: a frame on arrival,
 * a frame every 2 s across the whole run, and a restart check (`←` then `→`).
 * Finally it fires six presses inside one second and shoots where the deck lands.
 *
 *   node scripts/qa-walkthrough.mjs            # build must already exist
 *   node scripts/qa-walkthrough.mjs --out shots/qa2
 *
 * Every shot also records a geometry probe, so clipping inside a simulation is
 * caught by measurement rather than by eye alone.
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

/** Slide ids that host a self-playing simulation. */
const SIM_SLIDES = new Set(['sim-innbygger', 'sim-ustabil', 'sim-drift']);
/** Cover the longest scenario (~15.1 s) with headroom. */
const SIM_SPAN_MS = 16_000;
const SIM_FRAME_MS = 2_000;

function parseArgs(argv) {
  const args = { url: null, out: 'shots/qa2', port: 4178, dwell: 1400 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--dwell') args.dwell = Number(argv[++i]);
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

/**
 * Geometry + run state, read straight out of the DOM. Overflow is measured
 * against the canvas, not the viewport, so it is independent of the letterbox.
 */
const probe = (page) =>
  page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const out = { overflow: [], sim: null };

    const canvas = document.querySelector('.stage-canvas');
    const slide = document.querySelector('.deck__slide .slide');
    if (canvas && slide) {
      const scale = canvas.getBoundingClientRect().width / 1920;
      const cb = canvas.getBoundingClientRect();
      // Anything that pokes outside the 1920x1080 canvas is clipped on stage.
      for (const el of document.querySelectorAll('.deck__slide *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const over = {
          left: round((cb.left - r.left) / scale),
          right: round((r.right - cb.right) / scale),
          top: round((cb.top - r.top) / scale),
          bottom: round((r.bottom - cb.bottom) / scale),
        };
        const worst = Math.max(over.left, over.right, over.top, over.bottom);
        if (worst > 1.5) {
          out.overflow.push({
            sel: `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).join('.')}`.slice(0, 90),
            ...over,
          });
        }
      }
      // Text clipped inside its own box (ellipsis or a hard cut).
      out.clipped = [];
      for (const el of document.querySelectorAll('.deck__slide *')) {
        if (el.children.length > 0) continue;
        const text = (el.textContent ?? '').trim();
        if (!text) continue;
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          out.clipped.push({ text: text.slice(0, 60), by: el.scrollWidth - el.clientWidth });
        }
      }
    }

    const sim = document.querySelector('.deck__slide .sim');
    if (sim) {
      const stage = document.querySelector('.deck__slide .s-simstage');
      const sr = sim.getBoundingClientRect();
      const st = stage?.getBoundingClientRect();
      const scale = canvas ? canvas.getBoundingClientRect().width / 1920 : 1;
      out.sim = {
        name: sim.getAttribute('data-sim'),
        cursor: Number(sim.getAttribute('data-cursor')),
        playing: sim.getAttribute('data-playing'),
        done: sim.getAttribute('data-done'),
        heightPx: round(sr.height / scale),
        stageHeightPx: st ? round(st.height / scale) : null,
        overflowsStage: st ? round((sr.bottom - st.bottom) / scale) : null,
        rowsV8: sim.querySelectorAll('.pane--v8 .arow').length,
        rowsV9: sim.querySelectorAll('.pane--v9 .arow').length,
      };
    }
    return out;
  });

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
    if (/\.(png|json)$/.test(f)) await rm(path.join(outDir, f));
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
    const tag = [meta.id ?? 'x', meta.step === undefined ? null : `s${meta.step}`, meta.note]
      .filter(Boolean)
      .join('-')
      .replace(/[^a-z0-9-]+/gi, '-')
      .toLowerCase();
    const file = `${String(n).padStart(3, '0')}-${tag}.png`;
    await page.screenshot({ path: path.join(outDir, file) });
    const p = await probe(page);
    manifest.push({ n, file, ...meta, probe: p });
    const flag = p.overflow.length || p.clipped?.length ? '  ⚠' : '';
    process.stdout.write(`  ✓ ${file}${flag}\n`);
    n++;
  };

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-deck-root]', { timeout: READY_TIMEOUT_MS });
    await page.evaluate(() => document.fonts.ready);
    await settled(page);

    // ---------- forward pass ----------
    for (let guard = 0; guard < 200; guard++) {
      const at = await position(page);

      if (SIM_SLIDES.has(at.id) && at.step === 0) {
        // 1 s after arrival: does the scene start from zero, cleanly?
        await page.waitForTimeout(1000);
        await shoot({ ...at, pass: 'sim', note: 'arrive-1s' });

        // The whole autoplay, a frame every 2 s.
        for (let t = SIM_FRAME_MS; t <= SIM_SPAN_MS; t += SIM_FRAME_MS) {
          await page.waitForTimeout(SIM_FRAME_MS);
          await shoot({ ...at, pass: 'sim', note: `t${String(t / 1000).padStart(2, '0')}s` });
        }

        // Step off and back on: the scene must restart from the beginning.
        await page.keyboard.press('ArrowLeft');
        await settled(page);
        await page.waitForTimeout(900);
        const off = await position(page);
        await shoot({ ...off, pass: 'sim', note: `left-off-${at.id}` });

        await page.keyboard.press('ArrowRight');
        await settled(page);
        await page.waitForTimeout(1000);
        const back = await position(page);
        if (back.id !== at.id) errors.push(`← then → did not return to ${at.id} (landed on ${back.id})`);
        await shoot({ ...back, pass: 'sim', note: 'restart-1s' });

        await page.waitForTimeout(3000);
        await shoot({ ...back, pass: 'sim', note: 'restart-4s' });

        const after = await probe(page);
        if (after.sim && after.sim.cursor > 4) {
          errors.push(`${at.id}: restart did not reset — cursor ${after.sim.cursor} 4 s in`);
        }
      } else {
        await page.waitForTimeout(args.dwell);
        await shoot({ ...at, pass: 'forward' });
      }

      await page.keyboard.press('ArrowRight');
      await settled(page);
      const now = await position(page);
      if (now.index === at.index && now.step === at.step) break; // parked at the end
    }

    // ---------- overlays on the light theme ----------
    await page.keyboard.press('o');
    await page.waitForTimeout(1200);
    await shoot({ id: 'overlay-overview', pass: 'overlay', note: 'o-grid' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await page.keyboard.press('?');
    await page.waitForTimeout(700);
    await shoot({ id: 'overlay-help', pass: 'overlay', note: 'help' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const overlaysClosed = await page.evaluate(
      () => !document.querySelector('.overview') && !document.querySelector('.help__panel'),
    );
    if (!overlaysClosed) errors.push('Escape did not close an overlay');

    // ---------- six presses inside one second ----------
    await page.keyboard.press('Home');
    await settled(page);
    await page.waitForTimeout(600);
    const start = await position(page);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(140);
    }
    await settled(page);
    await page.waitForTimeout(900);
    const landed = await position(page);
    await shoot({ ...landed, pass: 'burst', note: 'after-6-fast-presses' });
    // 1 press → ett-klikk/1, 2 → i-dag/0, 3 → i-dag/1, 4 → i-dag/2, 5 → en-trad/0, 6 → en-trad/1
    if (landed.id !== 'en-trad' || landed.step !== 1) {
      errors.push(
        `six fast presses from ${start.id}/${start.step} landed on ${landed.id}/${landed.step}, expected en-trad/1`,
      );
    }

    await writeFile(
      path.join(outDir, 'manifest.json'),
      `${JSON.stringify(
        { viewport: VIEWPORT, capturedAt: new Date().toISOString(), shots: manifest },
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

  const flagged = manifest.filter((m) => m.probe.overflow.length || m.probe.clipped?.length);
  process.stdout.write(`\n${manifest.length} state(s) -> ${path.relative(ROOT, outDir)}/\n`);
  if (flagged.length) {
    process.stdout.write(`\nGeometry findings (${flagged.length}):\n`);
    for (const m of flagged) {
      process.stdout.write(`  ${m.file}\n`);
      for (const o of m.probe.overflow) process.stdout.write(`    overflow ${o.sel} ${JSON.stringify(o)}\n`);
      for (const c of m.probe.clipped ?? []) process.stdout.write(`    clipped  "${c.text}" by ${c.by}px\n`);
    }
  }

  if (errors.length) {
    process.stderr.write(`\nProblems:\n${errors.map((e) => `  - ${e}`).join('\n')}\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
