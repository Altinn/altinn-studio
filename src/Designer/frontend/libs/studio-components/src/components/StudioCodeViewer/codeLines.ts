const JSON_INDENT = '  ';
const BYTE_ORDER_MARK = '﻿';

/**
 * Indents valid JSON with two spaces for each level.
 * The function keeps each token as it is in the source, so numbers and escaped characters do not change.
 * @returns The formatted JSON, or null if the code is not valid JSON.
 */
export function formatJson(code: string): string | null {
  const source = code.startsWith(BYTE_ORDER_MARK) ? code.slice(1) : code;
  if (!isValidJson(source)) return null;

  let result = '';
  let depth = 0;
  let index = 0;
  const lineBreak = (): string => '\n' + JSON_INDENT.repeat(depth);

  while (index < source.length) {
    const character = source[index];
    if (isWhitespace(character)) {
      index++;
    } else if (character === '"') {
      const end = findStringEnd(source, index);
      result += source.slice(index, end + 1);
      index = end + 1;
    } else if (character === '{' || character === '[') {
      const closingIndex = findNextNonWhitespace(source, index + 1);
      if (source[closingIndex] === closingBracketOf(character)) {
        result += character + source[closingIndex];
        index = closingIndex + 1;
      } else {
        depth++;
        result += character + lineBreak();
        index++;
      }
    } else if (character === '}' || character === ']') {
      depth--;
      result += lineBreak() + character;
      index++;
    } else if (character === ',') {
      result += ',' + lineBreak();
      index++;
    } else if (character === ':') {
      result += ': ';
      index++;
    } else {
      const end = findLiteralEnd(source, index);
      result += source.slice(index, end);
      index = end;
    }
  }

  return result;
}

function isValidJson(code: string): boolean {
  try {
    JSON.parse(code);
    return true;
  } catch {
    return false;
  }
}

function isWhitespace(character: string): boolean {
  return /\s/.test(character);
}

function findStringEnd(code: string, startIndex: number): number {
  let index = startIndex + 1;
  while (code[index] !== '"') {
    index += code[index] === '\\' ? 2 : 1;
  }
  return index;
}

function findNextNonWhitespace(code: string, startIndex: number): number {
  let index = startIndex;
  while (isWhitespace(code[index])) index++;
  return index;
}

function findLiteralEnd(code: string, startIndex: number): number {
  let index = startIndex;
  while (index < code.length && !/[\s,:[\]{}"]/.test(code[index])) index++;
  return index;
}

function closingBracketOf(openingBracket: '{' | '['): '}' | ']' {
  return openingBracket === '{' ? '}' : ']';
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
