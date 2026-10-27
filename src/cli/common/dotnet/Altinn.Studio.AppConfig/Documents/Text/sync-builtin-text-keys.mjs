#!/usr/bin/env node
// Regenerates builtin-text-keys.json from app-frontend's default texts in src/common/ts/language.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const textsDir = resolve(here, '../../../../../../..', 'src/common/ts/language/src/texts');
const keys = new Set();
for (const language of ['nb', 'en', 'nn']) {
  const source = readFileSync(resolve(textsDir, `${language}.ts`), 'utf8');
  for (const match of source.matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm)) keys.add(match[1]);
}
writeFileSync(resolve(here, 'builtin-text-keys.json'), `${JSON.stringify([...keys].sort(), null, 2)}\n`);
console.log(`wrote ${keys.size} keys`);
