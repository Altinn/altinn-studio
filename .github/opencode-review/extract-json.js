// Extracts the first balanced JSON object from a raw model output file.
// Usage: node extract-json.js <input> <output>
// Falls back to {"issues": []} so the pipeline can continue with no findings
// rather than crashing on a stray non-JSON response.
const fs = require('node:fs');

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: extract-json.js <input> <output>');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const extracted = extractFirstJsonObject(raw);

if (!extracted) {
  console.warn(`No JSON object found in ${inputPath} — defaulting to empty issues list.`);
  fs.writeFileSync(outputPath, JSON.stringify({ issues: [] }));
  process.exit(0);
}

try {
  const parsed = JSON.parse(extracted);
  if (!Array.isArray(parsed.issues)) parsed.issues = [];
  fs.writeFileSync(outputPath, JSON.stringify(parsed));
} catch (error) {
  console.warn(
    `Extracted text was not valid JSON (${error.message}) — defaulting to empty issues list.`,
  );
  fs.writeFileSync(outputPath, JSON.stringify({ issues: [] }));
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const character = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (character === '\\' && inString) {
      escape = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
