import type {
  BlockNode,
  BlockquoteNode,
  CodeBlockNode,
  HeadingLevel,
  HeadingNode,
  InlineNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  ThematicBreakNode,
} from './types';

type ParseResult<Node> = { node: Node; nextIndex: number };

type ListMarker = {
  indent: number;
  contentIndent: number;
  ordered: boolean;
  delimiter: string;
  start: number;
  content: string;
};

const fenceOpenPattern = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;
const headingPattern = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const thematicBreakPattern = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const blockquotePattern = /^ {0,3}> ?(.*)$/;
const listItemPattern = /^( *)([-*+]|(\d{1,9})[.)])( +|$)(.*)$/;
const maxSpacesAfterListMarker = 4;
const escapablePattern = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

export function parseMarkdown(markdown: string): BlockNode[] {
  const lines: string[] = markdown.replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines);
}

function parseBlocks(lines: string[]): BlockNode[] {
  const blocks: BlockNode[] = [];
  let index = 0;
  while (index < lines.length) {
    if (isBlank(lines[index])) {
      index++;
      continue;
    }
    const { node, nextIndex } = parseBlock(lines, index);
    blocks.push(node);
    index = nextIndex;
  }
  return blocks;
}

function parseBlock(lines: string[], index: number): ParseResult<BlockNode> {
  return (
    parseCodeBlock(lines, index) ??
    parseHeading(lines, index) ??
    parseThematicBreak(lines, index) ??
    parseBlockquote(lines, index) ??
    parseList(lines, index) ??
    parseParagraph(lines, index)
  );
}

function parseCodeBlock(lines: string[], index: number): ParseResult<CodeBlockNode> | null {
  const match = fenceOpenPattern.exec(lines[index]);
  if (!match) return null;
  const [, fence, language] = match;
  const closingFencePattern = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`);
  const contentLines: string[] = [];
  let nextIndex = index + 1;
  while (nextIndex < lines.length && !closingFencePattern.test(lines[nextIndex])) {
    contentLines.push(lines[nextIndex]);
    nextIndex++;
  }
  const node: CodeBlockNode = { type: 'codeBlock', language, text: contentLines.join('\n') };
  return { node, nextIndex: nextIndex + 1 };
}

function parseHeading(lines: string[], index: number): ParseResult<HeadingNode> | null {
  const match = headingPattern.exec(lines[index]);
  if (!match) return null;
  const [, hashes, content = ''] = match;
  const level = hashes.length as HeadingLevel;
  return { node: { type: 'heading', level, children: parseInline(content) }, nextIndex: index + 1 };
}

function parseThematicBreak(lines: string[], index: number): ParseResult<ThematicBreakNode> | null {
  if (!thematicBreakPattern.test(lines[index])) return null;
  return { node: { type: 'thematicBreak' }, nextIndex: index + 1 };
}

function parseBlockquote(lines: string[], index: number): ParseResult<BlockquoteNode> | null {
  const quotedLines: string[] = [];
  let nextIndex = index;
  let match: RegExpExecArray | null;
  while (nextIndex < lines.length && (match = blockquotePattern.exec(lines[nextIndex]))) {
    quotedLines.push(match[1]);
    nextIndex++;
  }
  if (!quotedLines.length) return null;
  return { node: { type: 'blockquote', children: parseBlocks(quotedLines) }, nextIndex };
}

function parseList(lines: string[], index: number): ParseResult<ListNode> | null {
  const firstMarker = parseListMarker(lines[index]);
  if (!firstMarker) return null;
  const items: ListItemNode[] = [];
  let marker: ListMarker | null = firstMarker;
  let nextIndex = index;
  while (marker && isSameList(firstMarker, marker)) {
    const item = parseListItem(lines, nextIndex, marker);
    items.push(item.node);
    nextIndex = item.nextIndex;
    const nextItemIndex = findNextNonBlankLine(lines, nextIndex);
    marker = nextItemIndex === -1 ? null : parseListMarker(lines[nextItemIndex]);
    if (marker && isSameList(firstMarker, marker)) nextIndex = nextItemIndex;
  }
  const { ordered, start } = firstMarker;
  return { node: { type: 'list', ordered, start, items }, nextIndex };
}

function parseListMarker(line: string): ListMarker | null {
  if (thematicBreakPattern.test(line)) return null;
  const match = listItemPattern.exec(line);
  if (!match) return null;
  const [, indentation, marker, orderNumber, spacing, content] = match;
  const spacesAfterMarker = spacing.length > maxSpacesAfterListMarker ? 1 : spacing.length || 1;
  const leadingContentSpaces = spacing.length > maxSpacesAfterListMarker ? spacing.slice(1) : '';
  return {
    indent: indentation.length,
    contentIndent: indentation.length + marker.length + spacesAfterMarker,
    ordered: orderNumber !== undefined,
    delimiter: marker[marker.length - 1],
    start: orderNumber === undefined ? 1 : Number(orderNumber),
    content: leadingContentSpaces + content,
  };
}

function isSameList(first: ListMarker, other: ListMarker): boolean {
  return (
    first.ordered === other.ordered &&
    first.delimiter === other.delimiter &&
    other.indent < first.contentIndent
  );
}

function parseListItem(
  lines: string[],
  index: number,
  marker: ListMarker,
): ParseResult<ListItemNode> {
  const itemLines: string[] = [marker.content];
  let nextIndex = index + 1;
  while (nextIndex < lines.length) {
    const line = lines[nextIndex];
    if (isBlank(line)) {
      const nextContentIndex = findNextNonBlankLine(lines, nextIndex);
      if (nextContentIndex === -1 || indentationOf(lines[nextContentIndex]) < marker.contentIndent)
        break;
      itemLines.push(...lines.slice(nextIndex, nextContentIndex).map(() => ''));
      nextIndex = nextContentIndex;
      continue;
    }
    if (indentationOf(line) >= marker.contentIndent) {
      itemLines.push(line.slice(marker.contentIndent));
    } else if (isLazyContinuation(line, itemLines)) {
      itemLines.push(line.trimStart());
    } else {
      break;
    }
    nextIndex++;
  }
  return { node: { children: parseBlocks(itemLines) }, nextIndex };
}

function isLazyContinuation(line: string, precedingLines: string[]): boolean {
  const previousLine = precedingLines[precedingLines.length - 1];
  return !isBlank(previousLine) && !startsBlock(line) && !parseListMarker(line);
}

function findNextNonBlankLine(lines: string[], fromIndex: number): number {
  for (let index = fromIndex; index < lines.length; index++) {
    if (!isBlank(lines[index])) return index;
  }
  return -1;
}

function parseParagraph(lines: string[], index: number): ParseResult<ParagraphNode> {
  const paragraphLines: string[] = [lines[index].trimStart()];
  let nextIndex = index + 1;
  while (
    nextIndex < lines.length &&
    !isBlank(lines[nextIndex]) &&
    !startsBlock(lines[nextIndex]) &&
    !parseListMarker(lines[nextIndex])
  ) {
    paragraphLines.push(lines[nextIndex].trimStart());
    nextIndex++;
  }
  const content = paragraphLines.join('\n').trimEnd();
  return { node: { type: 'paragraph', children: parseInline(content) }, nextIndex };
}

function startsBlock(line: string): boolean {
  return (
    fenceOpenPattern.test(line) ||
    headingPattern.test(line) ||
    thematicBreakPattern.test(line) ||
    blockquotePattern.test(line)
  );
}

function isBlank(line: string): boolean {
  return line.trim() === '';
}

function indentationOf(line: string): number {
  return line.length - line.trimStart().length;
}

type InlineMatch = { nodes: InlineNode[]; end: number };

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = '';
  const flushBuffer = (): void => {
    if (buffer) nodes.push({ type: 'text', text: buffer });
    buffer = '';
  };

  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === '\\' && nextChar === '\n') {
      flushBuffer();
      nodes.push({ type: 'lineBreak' });
      index += 2;
    } else if (char === '\\' && nextChar !== undefined && escapablePattern.test(nextChar)) {
      buffer += nextChar;
      index += 2;
    } else if (char === '\n') {
      const isHardBreak = / {2,}$/.test(buffer);
      buffer = buffer.trimEnd();
      if (isHardBreak) {
        flushBuffer();
        nodes.push({ type: 'lineBreak' });
      } else {
        buffer += '\n';
      }
      index++;
    } else {
      const match = matchInlineConstruct(text, index);
      if (match) {
        flushBuffer();
        nodes.push(...match.nodes);
        index = match.end;
      } else {
        buffer += char;
        index++;
      }
    }
  }
  flushBuffer();
  return mergeAdjacentTextNodes(nodes);
}

function matchInlineConstruct(text: string, index: number): InlineMatch | null {
  switch (text[index]) {
    case '`':
      return matchCodeSpan(text, index);
    case '[':
      return matchLink(text, index);
    case '*':
    case '_':
      return (
        matchDelimited(text, index, text[index].repeat(2)) ??
        matchDelimited(text, index, text[index])
      );
    case '~':
      return matchDelimited(text, index, '~~');
    default:
      return null;
  }
}

function matchCodeSpan(text: string, index: number): InlineMatch {
  const openingLength = backtickRunLength(text, index);
  let searchIndex = index + openingLength;
  while (searchIndex < text.length) {
    const closingIndex = text.indexOf('`', searchIndex);
    if (closingIndex === -1) break;
    const closingLength = backtickRunLength(text, closingIndex);
    if (closingLength === openingLength) {
      const code = normalizeCodeSpanContent(text.slice(index + openingLength, closingIndex));
      return { nodes: [{ type: 'inlineCode', text: code }], end: closingIndex + closingLength };
    }
    searchIndex = closingIndex + closingLength;
  }
  const literal = text.slice(index, index + openingLength);
  return { nodes: [{ type: 'text', text: literal }], end: index + openingLength };
}

function backtickRunLength(text: string, index: number): number {
  let length = 0;
  while (text[index + length] === '`') length++;
  return length;
}

function normalizeCodeSpanContent(content: string): string {
  const singleLine = content.replace(/\n/g, ' ');
  const isPadded = /^ .*[^ ].* $/.test(singleLine) || /^ [^ ] $/.test(singleLine);
  return isPadded ? singleLine.slice(1, -1) : singleLine;
}

function matchLink(text: string, index: number): InlineMatch | null {
  const closingBracketIndex = findClosingBracket(text, index);
  if (closingBracketIndex === -1) return null;
  const destinationMatch =
    /^\(\s*(<[^<>\n]*>|[^\s()<>]*(?:\([^\s()]*\)[^\s()<>]*)*)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/.exec(
      text.slice(closingBracketIndex + 1),
    );
  if (!destinationMatch) return null;
  const href = unescapeBackslashes(destinationMatch[1].replace(/^<(.*)>$/, '$1'));
  const children = parseInline(text.slice(index + 1, closingBracketIndex));
  return {
    nodes: [{ type: 'link', href, children }],
    end: closingBracketIndex + 1 + destinationMatch[0].length,
  };
}

function findClosingBracket(text: string, openingIndex: number): number {
  let depth = 0;
  let index = openingIndex;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '`') {
      index = matchCodeSpan(text, index).end;
      continue;
    }
    if (char === '[') depth++;
    if (char === ']' && --depth === 0) return index;
    index++;
  }
  return -1;
}

function unescapeBackslashes(text: string): string {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1');
}

function matchDelimited(text: string, index: number, delimiter: string): InlineMatch | null {
  if (!text.startsWith(delimiter, index)) return null;
  if (!canOpen(text, index, delimiter)) return null;
  const contentStart = index + delimiter.length;
  const closingIndex = findClosingDelimiter(text, contentStart, delimiter);
  if (closingIndex === -1) return null;
  const children = parseInline(text.slice(contentStart, closingIndex));
  return {
    nodes: [{ type: nodeTypeForDelimiter(delimiter), children }],
    end: closingIndex + delimiter.length,
  };
}

function nodeTypeForDelimiter(delimiter: string): 'bold' | 'italic' | 'strikethrough' {
  if (delimiter === '~~') return 'strikethrough';
  return delimiter.length === 2 ? 'bold' : 'italic';
}

function canOpen(text: string, index: number, delimiter: string): boolean {
  const nextChar = text[index + delimiter.length];
  if (nextChar === undefined || /\s/.test(nextChar)) return false;
  if (delimiter[0] === '_' && isAlphanumeric(text[index - 1])) return false;
  return true;
}

function canClose(text: string, index: number, delimiter: string): boolean {
  const previousChar = text[index - 1];
  if (previousChar === undefined || /\s/.test(previousChar)) return false;
  if (delimiter[0] === '_' && isAlphanumeric(text[index + delimiter.length])) return false;
  return true;
}

function findClosingDelimiter(text: string, fromIndex: number, delimiter: string): number {
  const delimiterChar = delimiter[0];
  let index = fromIndex + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '`') {
      index = matchCodeSpan(text, index).end;
      continue;
    }
    if (char !== delimiterChar) {
      index++;
      continue;
    }
    const runLength = delimiterRunLength(text, index, delimiterChar);
    const candidate = pickClosingCandidate(text, fromIndex, index, runLength, delimiter);
    if (candidate !== -1 && canClose(text, candidate, delimiter)) return candidate;
    index = skipNestedDelimiters(text, index, runLength, delimiter);
  }
  return -1;
}

function delimiterRunLength(text: string, index: number, delimiterChar: string): number {
  let length = 0;
  while (text[index + length] === delimiterChar) length++;
  return length;
}

function pickClosingCandidate(
  text: string,
  contentStart: number,
  runStart: number,
  runLength: number,
  delimiter: string,
): number {
  if (runLength === delimiter.length) return runStart;
  if (delimiter.length === 1 && runLength >= 3) return runStart;
  if (delimiter.length === 2 && runLength === 3) {
    const hasUnclosedSingleDelimiter =
      countSingleDelimiters(text.slice(contentStart, runStart)) % 2 === 1;
    return hasUnclosedSingleDelimiter ? runStart + 1 : runStart;
  }
  return -1;
}

function countSingleDelimiters(text: string): number {
  return text
    .replace(/\\./g, '')
    .replace(/(\*\*|__)/g, '')
    .replace(/[^*_]/g, '').length;
}

function skipNestedDelimiters(
  text: string,
  runStart: number,
  runLength: number,
  delimiter: string,
): number {
  if (delimiter.length === 1 && runLength === 2) {
    const nested = matchDelimited(text, runStart, text[runStart].repeat(2));
    if (nested) return nested.end;
  }
  return runStart + runLength;
}

function isAlphanumeric(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function mergeAdjacentTextNodes(nodes: InlineNode[]): InlineNode[] {
  return nodes.reduce<InlineNode[]>((merged, node) => {
    const previous = merged[merged.length - 1];
    if (node.type === 'text' && previous?.type === 'text') {
      merged[merged.length - 1] = { type: 'text', text: previous.text + node.text };
    } else {
      merged.push(node);
    }
    return merged;
  }, []);
}
