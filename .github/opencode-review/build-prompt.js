// Builds round-2 critique and synthesis prompts by substituting placeholders
// in the corresponding template with JSON findings.
//
// Critique: build-prompt.js critique <own.json> <other.json> <out>
// Synthesis: build-prompt.js synthesis <claude.json> <openai.json> <out>
const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE_DIR = path.dirname(__filename);

const TEMPLATES = {
  critique: {
    file: 'critique-prompt.md',
    placeholders: { own: '{{OWN_FINDINGS}}', other: '{{OTHER_FINDINGS}}' },
  },
  synthesis: {
    file: 'synthesis-prompt.md',
    placeholders: { claude: '{{CLAUDE_FINDINGS}}', openai: '{{OPENAI_FINDINGS}}' },
  },
};

const [, , kind, firstJsonPath, secondJsonPath, outputPath] = process.argv;
const template = TEMPLATES[kind];
if (!template || !firstJsonPath || !secondJsonPath || !outputPath) {
  console.error('Usage: build-prompt.js <critique|synthesis> <first.json> <second.json> <out>');
  process.exit(1);
}

const templateText = fs.readFileSync(path.join(TEMPLATE_DIR, template.file), 'utf8');
const firstJson = fs.readFileSync(firstJsonPath, 'utf8');
const secondJson = fs.readFileSync(secondJsonPath, 'utf8');

const [firstPlaceholder, secondPlaceholder] = Object.values(template.placeholders);
// Function form keeps `$&`, `$1`, `$$` etc. inside the JSON literal — the
// string form would treat them as match-group references and corrupt the prompt.
const filled = templateText
  .replace(firstPlaceholder, () => firstJson)
  .replace(secondPlaceholder, () => secondJson);

fs.writeFileSync(outputPath, filled);
