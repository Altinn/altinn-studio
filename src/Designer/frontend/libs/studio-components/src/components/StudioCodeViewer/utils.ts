import type { highlightCode, StudioCodeViewerLanguage } from './highlightCode';
import { findJsonFoldRegions } from './codeLines';
import type { FoldRegion } from './codeLines';

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

let highlightCodeCache: typeof highlightCode | undefined;

export function getHighlightCodeIfLoaded(): typeof highlightCode | undefined {
  return highlightCodeCache;
}

export async function loadHighlightCode(): Promise<typeof highlightCode> {
  highlightCodeCache ??= (await import('./highlightCode')).highlightCode;
  return highlightCodeCache;
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
