const maximumLength = 40;

const norwegianLetters: Record<string, string> = { æ: 'ae', ø: 'o', å: 'aa' };

// Field names become C# property names in the generated data model.
const reservedWords = new Set([
  'abstract',
  'as',
  'base',
  'bool',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'checked',
  'class',
  'const',
  'continue',
  'decimal',
  'default',
  'delegate',
  'do',
  'double',
  'else',
  'enum',
  'event',
  'explicit',
  'extern',
  'false',
  'finally',
  'fixed',
  'float',
  'for',
  'foreach',
  'goto',
  'if',
  'implicit',
  'in',
  'int',
  'interface',
  'internal',
  'is',
  'lock',
  'long',
  'namespace',
  'new',
  'null',
  'object',
  'operator',
  'out',
  'override',
  'params',
  'private',
  'protected',
  'public',
  'readonly',
  'ref',
  'return',
  'sbyte',
  'sealed',
  'short',
  'sizeof',
  'stackalloc',
  'static',
  'string',
  'struct',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'uint',
  'ulong',
  'unchecked',
  'unsafe',
  'ushort',
  'using',
  'virtual',
  'void',
  'volatile',
  'while',
]);

const validFieldNamePattern = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * Suggests a data model field name from a label: Norwegian letters are spelled out, other
 * characters are dropped, and the words are joined in camelCase. "Første ønske" becomes
 * "forsteOnske". A number is added if the name is taken or reserved.
 */
export function suggestFieldName(label: string, takenNames: string[], fallback: string): string {
  const baseName = toCamelCase(label) || fallback;
  return makeUnique(baseName, takenNames);
}

export function isValidFieldName(name: string): boolean {
  return validFieldNamePattern.test(name) && !reservedWords.has(name.toLowerCase());
}

function toCamelCase(label: string): string {
  const words = label
    .toLowerCase()
    .replace(/[æøå]/g, (letter) => norwegianLetters[letter])
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^[0-9 ]+/, '')
    .split(' ')
    .filter(Boolean);
  const name = words
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
  return shortenAtWordBoundary(name, words);
}

function shortenAtWordBoundary(name: string, words: string[]): string {
  if (name.length <= maximumLength) return name;
  let shortened = '';
  for (const [index, word] of words.entries()) {
    const part = index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
    if ((shortened + part).length > maximumLength) break;
    shortened += part;
  }
  return shortened || name.slice(0, maximumLength);
}

function makeUnique(baseName: string, takenNames: string[]): string {
  const isAvailable = (name: string): boolean =>
    !takenNames.includes(name) && !reservedWords.has(name.toLowerCase());
  if (isAvailable(baseName)) return baseName;
  let number = 2;
  while (!isAvailable(`${baseName}${number}`)) number += 1;
  return `${baseName}${number}`;
}
