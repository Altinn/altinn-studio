#!/usr/bin/env node
// Checks each diagram that uses the shared style: that its copy of the style is current, that Inter loads, that its
// text only uses characters in the font subset, and that no text runs past the box it sits in. It renders each
// diagram in headless Chrome, since only a browser with the real font knows how wide the text is. Set CHROME_PATH to
// choose the browser.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hasStyle, relative, styleBlock, styledDiagrams, UNICODES, withStyle } from './style.mjs';

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const found = spawnSync('which', [name], { encoding: 'utf8' });
    if (found.status === 0) return found.stdout.trim();
  }
  throw new Error('no Chrome or Chromium found; set CHROME_PATH');
}

// Runs in the page. Reports each problem as a string.
function inspect(unicodes) {
  const problems = [];
  const inter = [...document.fonts].filter((face) => face.family.replaceAll('"', '') === 'Inter');
  if (inter.length === 0 || inter.some((face) => face.status !== 'loaded'))
    problems.push('Inter did not load');

  const svg = document.querySelector('svg');
  const boxes = [...svg.querySelectorAll('rect')].map((rect) => rect.getBBox());
  const inside = (box, x, y) =>
    x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  // Text needs this much room from the edges of its box, left and right.
  const margin = 2;

  for (const text of svg.querySelectorAll('text')) {
    const content = text.textContent;
    for (const char of content) {
      const code = char.codePointAt(0);
      if (!unicodes.some(([from, to]) => code >= from && code <= to)) {
        problems.push(`"${content}": "${char}" is not in the font subset`);
      }
    }
    // The box a text sits in is the smallest rect around its middle, and of equal ones the last drawn.
    const bbox = text.getBBox();
    let box = null;
    for (const candidate of boxes) {
      if (!inside(candidate, bbox.x + bbox.width / 2, bbox.y + bbox.height / 2)) continue;
      if (!box || candidate.width * candidate.height <= box.width * box.height) box = candidate;
    }
    if (!box) {
      problems.push(`"${content}" is outside every rect`);
      continue;
    }
    const edges = [];
    if (bbox.x < box.x + margin) edges.push('left');
    if (bbox.x + bbox.width > box.x + box.width - margin) edges.push('right');
    if (bbox.y < box.y) edges.push('top');
    if (bbox.y + bbox.height > box.y + box.height) edges.push('bottom');
    if (edges.length > 0) {
      const where = `${Math.round(box.width)}×${Math.round(box.height)} box at ${Math.round(box.x)},${Math.round(box.y)}`;
      problems.push(`"${content}" runs past the ${edges.join(' and ')} edge of the ${where}`);
    }
  }
  return problems;
}

function render(chrome, svg) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-check-'));
  try {
    const page = path.join(dir, 'page.html');
    // A browser loads a font weight only when text uses it, so load every embedded weight before checking them.
    const script = `Promise.all([...document.fonts].map((face) => face.load().catch(() => null))).then(() => {
      const problems = (${inspect})(${JSON.stringify(UNICODES)});
      document.getElementById('result').textContent = btoa(unescape(encodeURIComponent(JSON.stringify(problems))));
    });`;
    fs.writeFileSync(
      page,
      `<!doctype html><html><body>${svg}<pre id="result"></pre><script>${script}</script></body></html>`,
    );
    const run = spawnSync(
      chrome,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--virtual-time-budget=10000',
        '--dump-dom',
        `file://${page}`,
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const result = /<pre id="result">([A-Za-z0-9+/=]+)<\/pre>/.exec(run.stdout ?? '');
    if (!result)
      throw new Error(`Chrome returned no result (exit ${run.status}): ${run.stderr.slice(-500)}`);
    return JSON.parse(Buffer.from(result[1], 'base64').toString('utf8'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const diagrams = styledDiagrams();
if (diagrams.length === 0) {
  console.error('no diagram in docs/diagrams uses the shared style, so nothing was checked');
  process.exit(1);
}

const chrome = findChrome();
const block = styleBlock();
let failed = false;
for (const file of diagrams) {
  const svg = fs.readFileSync(file, 'utf8');
  const problems = [];
  if (!hasStyle(svg)) {
    problems.push('no diagram-style markers; copy them from docs/diagrams/architecture.svg');
  } else {
    if (withStyle(svg, block) !== svg)
      problems.push('the style is out of date; run yarn diagrams:sync');
    problems.push(...render(chrome, svg));
  }
  if (problems.length === 0) {
    console.log(`ok   ${relative(file)}`);
  } else {
    failed = true;
    console.log(`FAIL ${relative(file)}`);
    for (const problem of problems) console.log(`     ${problem}`);
  }
}
process.exit(failed ? 1 : 0);
