import type { BlockNode, CodeBlockNode, InlineNode, ListNode } from './types';

const hardLineBreak = '\\\n';
const thematicBreak = '---';
const minimumFenceLength = 3;
const bulletMarkers = ['-', '*'];
const orderedListDelimiters = ['.', ')'];

const delimiters = {
  bold: '**',
  italic: '*',
  strikethrough: '~~',
} as const;

export function serializeMarkdown(blocks: BlockNode[]): string {
  return serializeBlocks(blocks);
}

function serializeBlocks(blocks: BlockNode[]): string {
  const serializedBlocks: string[] = [];
  blocks.forEach((block, index) => {
    const serialized = serializeBlock(block, blocks[index - 1]);
    if (serialized !== null) serializedBlocks.push(serialized);
  });
  return serializedBlocks.join('\n\n');
}

function serializeBlock(block: BlockNode, previousBlock: BlockNode | undefined): string | null {
  switch (block.type) {
    case 'paragraph': {
      const content = serializeTextBlock(block.children);
      return content === '' ? null : content;
    }
    case 'heading': {
      const content = serializeTextBlock(block.children).replace(/\\?\n/g, ' ');
      const hashes = '#'.repeat(block.level);
      return content === '' ? hashes : `${hashes} ${content}`;
    }
    case 'blockquote':
      return prefixLines(serializeBlocks(block.children), '> ', '>');
    case 'codeBlock':
      return serializeCodeBlock(block);
    case 'thematicBreak':
      return thematicBreak;
    case 'list':
      return serializeList(block, isAdjacentSimilarList(block, previousBlock));
  }
}

function isAdjacentSimilarList(list: ListNode, previousBlock: BlockNode | undefined): boolean {
  return previousBlock?.type === 'list' && previousBlock.ordered === list.ordered;
}

function serializeCodeBlock({ language, text }: CodeBlockNode): string {
  const longestBacktickRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(minimumFenceLength, longestBacktickRun + 1));
  return `${fence}${language}\n${text}\n${fence}`;
}

function serializeList(list: ListNode, useAlternativeMarker: boolean): string {
  const markerIndex = useAlternativeMarker ? 1 : 0;
  return list.items
    .map((item, index) => {
      const marker = list.ordered
        ? `${list.start + index}${orderedListDelimiters[markerIndex]}`
        : bulletMarkers[markerIndex];
      const content = serializeListItemContent(item.children);
      const indentation = ' '.repeat(marker.length + 1);
      return content === '' ? marker : `${marker} ${indentLines(content, indentation)}`;
    })
    .join('\n');
}

function serializeListItemContent(blocks: BlockNode[]): string {
  const parts: string[] = [];
  blocks.forEach((block, index) => {
    const serialized = serializeBlock(block, blocks[index - 1]);
    if (serialized === null) return;
    const separator = parts.length === 0 ? '' : block.type === 'list' ? '\n' : '\n\n';
    parts.push(separator + serialized);
  });
  return parts.join('');
}

function indentLines(text: string, indentation: string): string {
  return text
    .split('\n')
    .map((line, index) => (index === 0 || line === '' ? line : indentation + line))
    .join('\n');
}

function prefixLines(text: string, prefix: string, emptyLinePrefix: string): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? emptyLinePrefix : prefix + line))
    .join('\n');
}

function serializeTextBlock(nodes: InlineNode[]): string {
  return escapeLineStarts(serializeInline(nodes).trim());
}

function escapeLineStarts(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^(\s*)(#{1,6}(?:\s|$)|>|[-+](?:\s|$)|-(?=[-\s]*$)|={3,}\s*$)/, '$1\\$2')
        .replace(/^(\s*\d+)([.)](?:\s|$))/, '$1\\$2'),
    )
    .join('\n');
}

function serializeInline(nodes: InlineNode[]): string {
  return nodes.map(serializeInlineNode).join('');
}

function serializeInlineNode(node: InlineNode): string {
  switch (node.type) {
    case 'text':
      return escapeText(node.text);
    case 'lineBreak':
      return hardLineBreak;
    case 'inlineCode':
      return serializeInlineCode(node.text);
    case 'link':
      return `[${serializeInline(node.children)}](${serializeLinkDestination(node.href)})`;
    case 'bold':
    case 'italic':
    case 'strikethrough':
      return wrapWithDelimiter(serializeInline(node.children), delimiters[node.type]);
  }
}

function wrapWithDelimiter(content: string, delimiter: string): string {
  const [, leadingWhitespace, core, trailingWhitespace] = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
  if (core === '') return content;
  return `${leadingWhitespace}${delimiter}${core}${delimiter}${trailingWhitespace}`;
}

function serializeInlineCode(text: string): string {
  const code = text.replace(/\n/g, ' ');
  const longestBacktickRun = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longestBacktickRun + 1);
  const needsPadding = code.startsWith('`') || code.endsWith('`') || /^ .* $/.test(code);
  const content = needsPadding ? ` ${code} ` : code;
  return `${fence}${content}${fence}`;
}

function serializeLinkDestination(href: string): string {
  const escaped = href.replace(/([\\<>])/g, '\\$1');
  const hasUnbalancedParentheses = !/^[^()]*(\([^()]*\)[^()]*)*$/.test(href);
  return /\s/.test(href) || hasUnbalancedParentheses ? `<${escaped}>` : escaped;
}

function escapeText(text: string): string {
  return Array.from(text.replace(/ +\n/g, '\n'))
    .map((char, index, chars) =>
      shouldEscape(char, chars[index - 1], chars[index + 1]) ? `\\${char}` : char,
    )
    .join('');
}

function shouldEscape(
  char: string,
  previous: string | undefined,
  next: string | undefined,
): boolean {
  switch (char) {
    case '*':
    case '`':
    case '[':
    case ']':
      return true;
    case '\\':
      return next === undefined || /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~\n]/.test(next);
    case '_':
      return !isAlphanumeric(previous) || !isAlphanumeric(next);
    case '~':
      return previous === undefined || next === undefined || previous === '~' || next === '~';
    default:
      return false;
  }
}

function isAlphanumeric(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}
