export type FoldRegion = {
  endIndex: number;
  closingColumn: number;
};

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

/** An element that continues on the next line is closed at the end of the line and opened again on the next line. */
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
