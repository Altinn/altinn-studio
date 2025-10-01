// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

let validLanguageKeys = undefined;
function getValidLanguageKeys(source = undefined) {
  if (validLanguageKeys === undefined || source !== undefined) {
    const sourceCode = source ?? fs.readFileSync(`${__dirname}/texts/en.ts`, 'utf-8');
    const functionSet = sourceCode.replace('export function en() {', 'en = () => {');
    if (functionSet.indexOf('return') === -1) {
      throw new Error('Language file en.ts does not contain a return statement');
    }
    if (functionSet.indexOf('en = () => {') !== 0) {
      console.warn(functionSet);
      throw new Error('Failed to parse language file en.ts');
    }

    let en = () => ({});
    eval(functionSet);
    validLanguageKeys = new Set(Object.keys(en()));
  }
  return validLanguageKeys;
}

// Helper function to check if a language key exists and report if it doesn't
function checkLanguageKey(key, node, context) {
  const validKeys = getValidLanguageKeys();
  if (key && !validKeys.has(key)) {
    context.report({
      node,
      message: `Language key '${key}' is not defined in the language files (en.ts, nb.ts, nn.ts)`,
    });
  }
}

const components = ['Lang', 'LangAsParagraph'];
const functionCalls = [
  'lang',
  'langAsString',
  'langAsStringUsingPathInDataModel',
  'langAsNonProcessedString',
  'langAsNonProcessedStringUsingPathInDataModel',
];

module.exports = {
  name: 'language-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Language key has to be defined in en.ts/nb.ts/nn.ts',
    },
    schema: [],
    messages: {
      missingLanguageKey: 'Language key is missing',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      FunctionDeclaration(node) {
        if (node.id.name === 'en' && node.params.length === 0) {
          getValidLanguageKeys(`export ${context.getSourceCode().getText(node)}`);
        }
      },
      JSXOpeningElement(node) {
        if (components.indexOf(node.name.name) === -1) {
          return;
        }

        const idAttribute = node.attributes.find((attr) => attr.type === 'JSXAttribute' && attr.name.name === 'id');
        if (!idAttribute || !idAttribute.value) {
          return;
        }

        const literals = [];
        if (idAttribute.value.type === 'JSXExpressionContainer') {
          findLiterals(idAttribute.value.expression, literals);
        } else {
          findLiterals(idAttribute.value, literals);
        }
        for (const literal of literals) {
          checkLanguageKey(literal.value, literal, context);
        }
      },
      CallExpression(node) {
        if (
          !(
            // Direct function call: lang('key')
            (
              (node.callee.type === 'Identifier' && functionCalls.indexOf(node.callee.name) !== -1) ||
              // Method call: obj.lang('key') or this.lang('key')
              (node.callee.type === 'MemberExpression' && functionCalls.indexOf(node.callee.property.name) !== -1)
            )
          )
        ) {
          return;
        }

        // Check if the first argument is a string literal
        const literals = [];
        findLiterals(node.arguments[0], literals);
        for (const literal of literals) {
          checkLanguageKey(literal.value, literal, context);
        }
      },
    };
  },
};

function findLiterals(node, result = []) {
  if (node.type === 'Literal') {
    result.push(node);
  } else if (node.type === 'LogicalExpression') {
    findLiterals(node.left, result);
    findLiterals(node.right, result);
  } else if (node.type === 'ConditionalExpression') {
    findLiterals(node.test, result);
    findLiterals(node.consequent, result);
    findLiterals(node.alternate, result);
  }
}
