#!/usr/bin/env node
// Writes the shared style and the Inter font into each diagram that uses them.
import fs from 'node:fs';
import { relative, styleBlock, styledDiagrams, withStyle } from './style.mjs';

const block = styleBlock();
for (const file of styledDiagrams()) {
  const svg = fs.readFileSync(file, 'utf8');
  const synced = withStyle(svg, block);
  if (synced !== svg) {
    fs.writeFileSync(file, synced);
    console.log(`updated ${relative(file)}`);
  }
}
