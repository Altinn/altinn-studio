// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

let validTranslationKeys = undefined;

function getValidTranslationKeys() {
  if (validTranslationKeys !== undefined) {
    return validTranslationKeys;
  }

  const providerPath = path.resolve(__dirname, 'AppComponentsProvider.tsx');
  const source = fs.readFileSync(providerPath, 'utf-8');

  // Match: type AppComponentsTranslationKey = 'key1' | 'key2' | ... ;
  const match = source.match(/type AppComponentsTranslationKey\s*=\s*([^;]+);/);
  if (!match) {
    throw new Error('Could not find AppComponentsTranslationKey type in AppComponentsProvider.tsx');
  }

  const keys = new Set();
  const literalRegex = /'([^']+)'/g;
  let m;
  while ((m = literalRegex.exec(match[1])) !== null) {
    keys.add(m[1]);
  }

  validTranslationKeys = keys;
  return validTranslationKeys;
}

module.exports = {
  name: 'app-components-translation-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'translate() keys in app-components must be defined in AppComponentsTranslationKey',
    },
    schema: [],
    messages: {},
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        const isTranslateCall =
          (callee.type === 'Identifier' && callee.name === 'translate') ||
          (callee.type === 'MemberExpression' && callee.property.name === 'translate');

        if (!isTranslateCall) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type !== 'Literal' || typeof firstArg.value !== 'string') {
          return;
        }

        const validKeys = getValidTranslationKeys();
        if (!validKeys.has(firstArg.value)) {
          const validKeyList = [...validKeys].join(', ');
          context.report({
            node: firstArg,
            message: `'${firstArg.value}' is not a valid AppComponentsTranslationKey. Valid keys: ${validKeyList}`,
          });
        }
      },
    };
  },
};
