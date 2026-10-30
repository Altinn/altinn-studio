// The shared diagram style: what sync.mjs writes into each diagram and check.mjs verifies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DIAGRAMS_DIR = path.join(ROOT, 'docs/diagrams');
const STYLE_DIR = path.join(DIAGRAMS_DIR, 'style');

export const START = '/* diagram-style:start';
export const END = '/* diagram-style:end */';

// An SVG shown as an image cannot load fonts, so each diagram embeds Inter. The committed files are subset to these
// characters to keep each diagram small. A character outside them falls back to another font.
export const UNICODES = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x2013, 0x2014],
  [0x2018, 0x2019],
  [0x201c, 0x201d],
  [0x2026, 0x2026],
  [0x2192, 0x2192],
];

const WEIGHTS = [
  [400, 'Inter-Regular.woff2'],
  [500, 'Inter-Medium.woff2'],
  [600, 'Inter-SemiBold.woff2'],
];

export function styleBlock() {
  const fonts = WEIGHTS.map(([weight, file]) => {
    const data = fs.readFileSync(path.join(STYLE_DIR, 'fonts', file)).toString('base64');
    return `@font-face { font-family: "Inter"; font-weight: ${weight}; src: url(data:font/woff2;base64,${data}) format("woff2"); }`;
  });
  const css = fs.readFileSync(path.join(STYLE_DIR, 'diagram.css'), 'utf8').trimEnd();
  return [
    `${START}: written by scripts/diagrams/sync.mjs from docs/diagrams/style. Change it there, not here. */`,
    ...fonts,
    css,
    END,
  ].join('\n');
}

// The diagrams that use the shared style. Older diagrams, such as Excalidraw exports, do not.
export function styledDiagrams() {
  return fs
    .readdirSync(DIAGRAMS_DIR)
    .filter((name) => name.endsWith('.svg'))
    .map((name) => path.join(DIAGRAMS_DIR, name))
    .filter((file) => fs.readFileSync(file, 'utf8').includes(START));
}

export function withStyle(svg, block) {
  const start = svg.indexOf(START);
  const end = svg.indexOf(END, start);
  if (end === -1) throw new Error(`"${START}" has no "${END}" after it`);
  return svg.slice(0, start) + block + svg.slice(end + END.length);
}

export function relative(file) {
  return path.relative(ROOT, file);
}

// `node scripts/diagrams/style.mjs unicodes` prints the ranges for pyftsubset, as docs/diagrams/README.md shows.
if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === 'unicodes') {
  const hex = (code) => code.toString(16).toUpperCase().padStart(4, '0');
  console.log(
    UNICODES.map(([from, to]) =>
      from === to ? `U+${hex(from)}` : `U+${hex(from)}-${hex(to)}`,
    ).join(','),
  );
}
