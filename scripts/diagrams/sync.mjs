#!/usr/bin/env node
// Writes the shared style and the Inter font into each diagram that uses them.
import fs from 'node:fs';
import { hasStyle, relative, styleBlock, styledDiagrams, withStyle } from './style.mjs';

const block = styleBlock();
for (const file of styledDiagrams()) {
  const svg = fs.readFileSync(file, 'utf8');
  if (!hasStyle(svg)) {
    console.error(
      `${relative(file)} has no diagram-style markers; copy them from docs/diagrams/architecture.svg`,
    );
    process.exitCode = 1;
    continue;
  }
  const synced = withStyle(svg, block);
  if (synced !== svg) {
    fs.writeFileSync(file, synced);
    console.log(`updated ${relative(file)}`);
  }
}
