import type { StudioCodeViewerLanguage } from './registerHighlighter';

/**
 * Larger code is shown as plain text in one element, without colors and folds,
 * because one element for each line blocks the page for too long.
 */
export const MAX_FORMATTED_CODE_LENGTH = 100_000;

type FoldRegion = {
  endIndex: number;
  closingColumn: number;
};

export type CodeLines = {
  code: string;
  lines: string[];
  foldRegions: Map<number, FoldRegion>;
};

export function createCodeLines(code: string, language?: StudioCodeViewerLanguage): CodeLines {
  const normalizedCode = code.replace(/\r\n?/g, '\n');
  return {
    code: normalizedCode,
    lines: normalizedCode.split('\n'),
    foldRegions: language === 'json' ? findJsonFoldRegions(normalizedCode) : new Map(),
  };
}

const JSON_FOLD_TOKENS = /"[^"\\\n]*(?:\\.[^"\\\n]*)*"|[{}[\]]|\n/g;

/**
 * Uses the same rules as VS Code: a region must hide minimum one line,
 * and when more regions start on the same line, the innermost region is used.
 */
export function findJsonFoldRegions(code: string): Map<number, FoldRegion> {
  const regions = new Map<number, FoldRegion>();
  const openBrackets: { bracket: string; lineIndex: number }[] = [];
  let lineIndex = 0;
  let lineStart = 0;
  for (const { 0: token, index } of code.matchAll(JSON_FOLD_TOKENS)) {
    if (token === '\n') {
      lineIndex++;
      lineStart = index + 1;
    } else if (token === '{' || token === '[') {
      openBrackets.push({ bracket: token, lineIndex });
    } else if (token === '}' || token === ']') {
      const open = openBrackets.at(-1);
      if (open?.bracket !== (token === '}' ? '{' : '[')) continue;
      openBrackets.pop();
      if (lineIndex > open.lineIndex + 1 && !regions.has(open.lineIndex)) {
        regions.set(open.lineIndex, { endIndex: lineIndex, closingColumn: index - lineStart });
      }
    }
  }
  return regions;
}

export function findVisibleLineIndexes(
  { lines, foldRegions }: CodeLines,
  collapsedIndexes: ReadonlySet<number>,
): number[] {
  const visibleIndexes: number[] = [];
  let index = 0;
  while (index < lines.length) {
    visibleIndexes.push(index);
    index = collapsedIndexes.has(index) ? foldRegions.get(index).endIndex + 1 : index + 1;
  }
  return visibleIndexes;
}

export function findFoldButtonForKey(
  foldButtons: HTMLButtonElement[],
  currentButton: HTMLButtonElement,
  key: string,
): HTMLButtonElement | undefined {
  const position = foldButtons.indexOf(currentButton);
  switch (key) {
    case 'ArrowDown':
      return foldButtons[position + 1];
    case 'ArrowUp':
      return foldButtons[position - 1];
    case 'Home':
      return foldButtons[0];
    case 'End':
      return foldButtons.at(-1);
    default:
      return undefined;
  }
}
