const JSON_INDENT = '  ';
/** Strings, punctuation, and the numbers and literals between them. */
const JSON_TOKENS = /"[^"\\]*(?:\\.[^"\\]*)*"|[{}[\]:,]|[^\s{}[\]:,"]+/g;

/**
 * Indents valid JSON with two spaces for each level.
 * The function keeps each token as it is in the source, so numbers and escaped characters do not change.
 * @returns The formatted JSON, or null if the code is not valid JSON.
 */
export function formatJson(code: string): string | null {
  const source = code.replace(/^\uFEFF/, '');
  if (!isValidJson(source)) return null;

  const tokens = source.match(JSON_TOKENS);
  let result = '';
  let depth = 0;
  tokens.forEach((token, index) => {
    const previousToken = tokens[index - 1];
    const isClosingBracket = token === '}' || token === ']';
    if (isClosingBracket) depth--;
    // A line break comes after an opening bracket, before a closing bracket and after a comma.
    // An empty object or array stays on one line.
    if (isOpeningBracket(previousToken) !== isClosingBracket || previousToken === ',') {
      result += '\n' + JSON_INDENT.repeat(depth);
    }
    result += token === ':' ? ': ' : token;
    if (isOpeningBracket(token)) depth++;
  });
  return result;
}

function isOpeningBracket(token: string): boolean {
  return token === '{' || token === '[';
}

function isValidJson(code: string): boolean {
  try {
    JSON.parse(code);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds the lines where an object or an array starts and ends in JSON from formatJson.
 * @returns A map from the index of the first line of each region to the index of its last line.
 */
export function findJsonFoldRegions(lines: string[]): Map<number, number> {
  const regions = new Map<number, number>();
  const openLineIndexes: number[] = [];
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (/^[}\]]/.test(trimmedLine)) {
      regions.set(openLineIndexes.pop(), index);
    }
    if (/[{[]$/.test(trimmedLine)) {
      openLineIndexes.push(index);
    }
  });
  return regions;
}

/**
 * Splits the HTML from the highlighter into lines.
 * An element that continues on the next line is closed at the end of the line and opened again on the next line.
 */
export function splitHighlightedCodeIntoLines(html: string): string[] {
  const lines: string[] = [];
  const openTags: string[] = [];
  let currentLine = '';
  const closeOpenTags = (): string => '</span>'.repeat(openTags.length);

  html
    .split(/(<span[^>]*>|<\/span>|\n)/)
    .filter(Boolean)
    .forEach((part) => {
      if (part === '\n') {
        lines.push(currentLine + closeOpenTags());
        currentLine = openTags.join('');
      } else {
        if (part.startsWith('<span')) openTags.push(part);
        if (part === '</span>') openTags.pop();
        currentLine += part;
      }
    });
  lines.push(currentLine + closeOpenTags());
  return lines;
}
