const fs = require('fs');

const [, , baseFile, customFile, mergedFile] = process.argv;

if (!baseFile || !customFile || !mergedFile) {
  console.error(
    'Usage: node merge.js <base-values.json> <custom-values.json> <merged-values.json>',
  );
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(baseFile, 'utf-8'));
const custom = JSON.parse(fs.readFileSync(customFile, 'utf-8'));

const merged = { ...base, ...custom };

fs.writeFileSync(mergedFile, JSON.stringify(merged, null, 2) + '\n', 'utf-8');

console.log('Updated!');
