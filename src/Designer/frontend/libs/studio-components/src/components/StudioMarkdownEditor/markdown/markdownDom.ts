import type {
  BlockNode,
  FormattingNode,
  HeadingLevel,
  InlineNode,
  ListItemNode,
  ListNode,
} from './types';

const unsafeHrefAttribute = 'data-unsafe-href';
const codeLanguageAttribute = 'data-language';
const safeUrlSchemes = ['http', 'https', 'mailto', 'tel'];
const blockTagNames = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIGURE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
]);

export function isSafeHref(href: string): boolean {
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(removeUrlControlCharacters(href));
  return !scheme || safeUrlSchemes.includes(scheme[1].toLowerCase());
}

function removeUrlControlCharacters(href: string): string {
  return href.replace(/[\u0000-\u0020\u007f]/g, '');
}

export function renderBlocksToDom(blocks: BlockNode[], document: Document): DocumentFragment {
  const fragment = document.createDocumentFragment();
  blocks.forEach((block) => fragment.appendChild(renderBlock(block, document)));
  if (!blocks.length) fragment.appendChild(createEmptyParagraph(document));
  return fragment;
}

export function createEmptyParagraph(document: Document): HTMLParagraphElement {
  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  return paragraph;
}

function renderBlock(block: BlockNode, document: Document): Node {
  switch (block.type) {
    case 'paragraph':
      return renderTextBlock(document.createElement('p'), block.children, document);
    case 'heading':
      return renderTextBlock(document.createElement(`h${block.level}`), block.children, document);
    case 'blockquote': {
      const blockquote = document.createElement('blockquote');
      blockquote.appendChild(renderBlocksToDom(block.children, document));
      return blockquote;
    }
    case 'codeBlock': {
      const pre = document.createElement('pre');
      if (block.language) pre.setAttribute(codeLanguageAttribute, block.language);
      pre.textContent = block.text;
      if (!block.text) pre.appendChild(document.createElement('br'));
      return pre;
    }
    case 'thematicBreak':
      return document.createElement('hr');
    case 'list':
      return renderList(block, document);
  }
}

function renderList(list: ListNode, document: Document): HTMLElement {
  const listElement = document.createElement(list.ordered ? 'ol' : 'ul');
  if (list.ordered && list.start !== 1) listElement.setAttribute('start', String(list.start));
  list.items.forEach((item) => listElement.appendChild(renderListItem(item, document)));
  return listElement;
}

function renderListItem(item: ListItemNode, document: Document): HTMLLIElement {
  const listItem = document.createElement('li');
  const [firstBlock, ...otherBlocks] = item.children;
  const inlineFirstBlock = firstBlock?.type === 'paragraph';
  if (inlineFirstBlock) renderTextBlock(listItem, firstBlock.children, document);
  const remainingBlocks = inlineFirstBlock ? otherBlocks : item.children;
  remainingBlocks.forEach((block) => listItem.appendChild(renderBlock(block, document)));
  if (!listItem.hasChildNodes()) listItem.appendChild(document.createElement('br'));
  return listItem;
}

function renderTextBlock<Element extends HTMLElement>(
  element: Element,
  nodes: InlineNode[],
  document: Document,
): Element {
  nodes.forEach((node) => element.appendChild(renderInline(node, document)));
  const lastNode = nodes[nodes.length - 1];
  if (!nodes.length || lastNode.type === 'lineBreak') {
    element.appendChild(document.createElement('br'));
  }
  return element;
}

function renderInline(node: InlineNode, document: Document): Node {
  switch (node.type) {
    case 'text':
      return document.createTextNode(node.text);
    case 'lineBreak':
      return document.createElement('br');
    case 'inlineCode': {
      const code = document.createElement('code');
      code.textContent = node.text;
      return code;
    }
    case 'link': {
      const anchor = document.createElement('a');
      anchor.setAttribute(isSafeHref(node.href) ? 'href' : unsafeHrefAttribute, node.href);
      return appendInlineChildren(anchor, node.children, document);
    }
    case 'bold':
      return appendInlineChildren(document.createElement('strong'), node.children, document);
    case 'italic':
      return appendInlineChildren(document.createElement('em'), node.children, document);
    case 'strikethrough':
      return appendInlineChildren(document.createElement('s'), node.children, document);
  }
}

function appendInlineChildren<Element extends HTMLElement>(
  element: Element,
  nodes: InlineNode[],
  document: Document,
): Element {
  nodes.forEach((node) => element.appendChild(renderInline(node, document)));
  return element;
}

export function parseDomToBlocks(root: Node): BlockNode[] {
  const blocks: BlockNode[] = [];
  let pendingInlineNodes: Node[] = [];
  const flushInlineNodes = (): void => {
    const children = normalizeTextBlock(pendingInlineNodes.flatMap(parseInlineNode));
    if (children.length) blocks.push({ type: 'paragraph', children });
    pendingInlineNodes = [];
  };

  root.childNodes.forEach((child) => {
    if (isBlockElement(child)) {
      flushInlineNodes();
      blocks.push(...parseBlockElement(child));
    } else {
      pendingInlineNodes.push(child);
    }
  });
  flushInlineNodes();
  return blocks;
}

function isBlockElement(node: Node): node is HTMLElement {
  return isElement(node) && blockTagNames.has(node.tagName);
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

function parseBlockElement(element: HTMLElement): BlockNode[] {
  const tagName = element.tagName;
  const headingMatch = /^H([1-6])$/.exec(tagName);
  if (headingMatch) {
    const level = Number(headingMatch[1]) as HeadingLevel;
    return [{ type: 'heading', level, children: normalizeTextBlock(parseInlineChildren(element)) }];
  }
  switch (tagName) {
    case 'BLOCKQUOTE':
      return [{ type: 'blockquote', children: parseDomToBlocks(element) }];
    case 'PRE': {
      const language = element.getAttribute(codeLanguageAttribute) ?? '';
      return [{ type: 'codeBlock', language, text: extractCodeText(element) }];
    }
    case 'HR':
      return [{ type: 'thematicBreak' }];
    case 'UL':
    case 'OL':
      return [parseListElement(element)];
    default:
      return parseDomToBlocks(element);
  }
}

function parseListElement(element: HTMLElement): ListNode {
  const items: ListItemNode[] = [];
  element.childNodes.forEach((child) => {
    if (isElement(child) && child.tagName === 'LI') {
      items.push({ children: parseDomToBlocks(child) });
    } else if (isElement(child) && (child.tagName === 'UL' || child.tagName === 'OL')) {
      appendNestedListToLastItem(items, parseListElement(child));
    } else if (child.textContent?.trim()) {
      items.push({ children: parseDomToBlocks(wrapInFragment(child)) });
    }
  });
  const ordered = element.tagName === 'OL';
  const start = ordered ? Number(element.getAttribute('start') ?? 1) || 1 : 1;
  return { type: 'list', ordered, start, items };
}

function appendNestedListToLastItem(items: ListItemNode[], nestedList: ListNode): void {
  const lastItem = items.pop();
  items.push({ children: [...(lastItem?.children ?? []), nestedList] });
}

function wrapInFragment(node: Node): DocumentFragment {
  const fragment = node.ownerDocument.createDocumentFragment();
  fragment.appendChild(node.cloneNode(true));
  return fragment;
}

function extractCodeText(element: HTMLElement): string {
  const text = Array.from(element.childNodes).map(extractCodeTextFromNode).join('');
  return text.replace(/\n$/, '');
}

function extractCodeTextFromNode(node: Node): string {
  if (!isElement(node)) return (node.textContent ?? '').replace(/\u00a0/g, ' ');
  if (node.tagName === 'BR') return '\n';
  const text = Array.from(node.childNodes).map(extractCodeTextFromNode).join('');
  return isBlockElement(node) && !text.endsWith('\n') ? `${text}\n` : text;
}

function parseInlineChildren(element: Node): InlineNode[] {
  return Array.from(element.childNodes).flatMap(parseInlineNode);
}

function parseInlineNode(node: Node): InlineNode[] {
  if (node.nodeType === Node.TEXT_NODE)
    return [{ type: 'text', text: cleanText(node.textContent) }];
  if (!isElement(node)) return [];
  switch (node.tagName) {
    case 'BR':
      return [{ type: 'lineBreak' }];
    case 'CODE':
      return [{ type: 'inlineCode', text: cleanText(node.textContent) }];
    case 'A': {
      const href = node.getAttribute('href') ?? node.getAttribute(unsafeHrefAttribute) ?? '';
      return [{ type: 'link', href, children: parseInlineChildren(node) }];
    }
    case 'STRONG':
    case 'B':
      return [{ type: 'bold', children: parseInlineChildren(node) }];
    case 'EM':
    case 'I':
      return [{ type: 'italic', children: parseInlineChildren(node) }];
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return [{ type: 'strikethrough', children: parseInlineChildren(node) }];
    default:
      return wrapWithInlineStyles(node, parseInlineChildren(node));
  }
}

function cleanText(text: string | null): string {
  return (text ?? '').replace(/\u00a0/g, ' ').replace(/\u200b/g, '');
}

function wrapWithInlineStyles(element: HTMLElement, children: InlineNode[]): InlineNode[] {
  const { fontWeight, fontStyle, textDecoration, textDecorationLine } = element.style;
  let wrapped: InlineNode[] = children;
  if (fontWeight === 'bold' || Number(fontWeight) >= 600)
    wrapped = [{ type: 'bold', children: wrapped }];
  if (fontStyle === 'italic') wrapped = [{ type: 'italic', children: wrapped }];
  if (`${textDecoration} ${textDecorationLine}`.includes('line-through')) {
    wrapped = [{ type: 'strikethrough', children: wrapped }];
  }
  return wrapped;
}

function normalizeTextBlock(nodes: InlineNode[]): InlineNode[] {
  const normalized = normalizeInline(nodes);
  return trimTextBlock(normalized);
}

function normalizeInline(
  nodes: InlineNode[],
  enclosingTypes: InlineNode['type'][] = [],
): InlineNode[] {
  const result: InlineNode[] = [];
  nodes.forEach((node) => {
    normalizeInlineNode(node, enclosingTypes).forEach((normalizedNode) =>
      appendMerged(result, normalizedNode),
    );
  });
  return result;
}

function normalizeInlineNode(node: InlineNode, enclosingTypes: InlineNode['type'][]): InlineNode[] {
  switch (node.type) {
    case 'text':
      return node.text ? [node] : [];
    case 'inlineCode':
      return node.text ? [node] : [];
    case 'lineBreak':
      return [node];
    default:
      return normalizeFormattingNode(node, enclosingTypes);
  }
}

function normalizeFormattingNode(
  node: FormattingNode,
  enclosingTypes: InlineNode['type'][],
): InlineNode[] {
  const children = normalizeInline(node.children, [...enclosingTypes, node.type]);
  if (enclosingTypes.includes(node.type)) return children;
  const { leading, core, trailing } = splitEdgeWhitespace(children);
  if (!core.length) return [...leading, ...trailing];
  return [...leading, { ...node, children: core }, ...trailing];
}

function splitEdgeWhitespace(nodes: InlineNode[]): {
  leading: InlineNode[];
  core: InlineNode[];
  trailing: InlineNode[];
} {
  const core = [...nodes];
  const leading: InlineNode[] = [];
  const trailing: InlineNode[] = [];
  while (core.length && isWhitespaceOrLineBreak(core[0])) leading.push(core.shift());
  while (core.length && isWhitespaceOrLineBreak(core[core.length - 1]))
    trailing.unshift(core.pop());
  return { leading, core, trailing };
}

function isWhitespaceOrLineBreak(node: InlineNode): boolean {
  return node.type === 'lineBreak' || (node.type === 'text' && node.text.trim() === '');
}

function appendMerged(nodes: InlineNode[], node: InlineNode): void {
  const previous = nodes[nodes.length - 1];
  if (previous?.type === 'text' && node.type === 'text') {
    nodes[nodes.length - 1] = { type: 'text', text: previous.text + node.text };
  } else if (isFormattingNode(previous) && isFormattingNode(node) && canMerge(previous, node)) {
    const children = normalizeInline([...previous.children, ...node.children]);
    nodes[nodes.length - 1] = { ...previous, children };
  } else {
    nodes.push(node);
  }
}

function isFormattingNode(node: InlineNode | undefined): node is FormattingNode {
  return node !== undefined && 'children' in node;
}

function canMerge(previous: FormattingNode, node: FormattingNode): boolean {
  if (previous.type !== node.type) return false;
  return previous.type !== 'link' || (node.type === 'link' && previous.href === node.href);
}

function trimTextBlock(nodes: InlineNode[]): InlineNode[] {
  const trimmed = [...nodes];
  while (trimmed.length && trimmed[trimmed.length - 1].type === 'lineBreak') trimmed.pop();
  return trimmed;
}
