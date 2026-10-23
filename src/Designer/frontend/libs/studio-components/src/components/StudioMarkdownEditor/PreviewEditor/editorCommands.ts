import type { FormattingCommand, FormattingState } from '../types/FormattingCommand';

type HeadingCommand = Extract<FormattingCommand, `heading${number}`>;

const headingTagNames: Readonly<Record<HeadingCommand, string>> = {
  heading1: 'H1',
  heading2: 'H2',
  heading3: 'H3',
};

const inlineFormattingCommands: ReadonlySet<FormattingCommand> = new Set([
  'bold',
  'italic',
  'strikethrough',
  'inlineCode',
  'link',
]);

const zeroWidthSpace = '\u200b';

export const inactiveFormattingState: FormattingState = {
  bold: false,
  italic: false,
  strikethrough: false,
  inlineCode: false,
  link: false,
  heading1: false,
  heading2: false,
  heading3: false,
  bulletList: false,
  numberedList: false,
  quote: false,
  codeBlock: false,
};

export function isInlineFormattingCommand(command: FormattingCommand): boolean {
  return inlineFormattingCommands.has(command);
}

export function getEditorRange(editor: HTMLElement): Range | null {
  const selection = editor.ownerDocument.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? range : null;
}

/**
 * Moves focus to the editor and restores the given range if the selection has left the editor.
 * The selection is kept as is when it is already in the editor, since resetting it would clear any pending typing style.
 */
export function focusEditor(editor: HTMLElement, fallbackRange: Range | null): void {
  if (editor.ownerDocument.activeElement !== editor) editor.focus();
  if (!getEditorRange(editor)) restoreRange(editor, fallbackRange);
}

export function restoreRange(editor: HTMLElement, range: Range | null): void {
  editor.focus();
  if (!range) return;
  const selection = editor.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function getFormattingState(editor: HTMLElement, range: Range | null): FormattingState {
  if (!range) return inactiveFormattingState;
  const isInside = (tagNames: string[]): boolean =>
    !!findClosestElement(editor, range.startContainer, tagNames);
  const closestList = findClosestElement(editor, range.startContainer, ['UL', 'OL']);
  return {
    bold: isInside(['STRONG', 'B']),
    italic: isInside(['EM', 'I']),
    strikethrough: isInside(['S', 'STRIKE', 'DEL']),
    inlineCode: isInside(['CODE']),
    link: isInside(['A']),
    heading1: isInside([headingTagNames.heading1]),
    heading2: isInside([headingTagNames.heading2]),
    heading3: isInside([headingTagNames.heading3]),
    bulletList: closestList?.tagName === 'UL',
    numberedList: closestList?.tagName === 'OL',
    quote: isInside(['BLOCKQUOTE']),
    codeBlock: isInside(['PRE']),
  };
}

export function findClosestElement(
  editor: HTMLElement,
  node: Node,
  tagNames: string[],
): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== editor) {
    if (current instanceof HTMLElement && tagNames.includes(current.tagName)) return current;
    current = current.parentNode;
  }
  return null;
}

export function prepareEditor(editor: HTMLElement): void {
  runNativeCommand(editor, 'styleWithCSS', 'false');
  runNativeCommand(editor, 'defaultParagraphSeparator', 'p');
}

export function applyFormattingCommand(
  editor: HTMLElement,
  command: Exclude<FormattingCommand, 'link'>,
  state: FormattingState,
): void {
  switch (command) {
    case 'bold':
      return runNativeCommand(editor, 'bold');
    case 'italic':
      return runNativeCommand(editor, 'italic');
    case 'strikethrough':
      return runNativeCommand(editor, 'strikeThrough');
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return toggleBlockFormat(editor, headingTagNames[command], state[command]);
    case 'codeBlock':
      return toggleBlockFormat(editor, 'PRE', state.codeBlock);
    case 'bulletList':
      return runNativeCommand(editor, 'insertUnorderedList');
    case 'numberedList':
      return runNativeCommand(editor, 'insertOrderedList');
    case 'quote':
      return state.quote
        ? removeBlockquote(editor)
        : runNativeCommand(editor, 'formatBlock', '<blockquote>');
    case 'inlineCode':
      return state.inlineCode ? removeInlineCode(editor) : insertInlineCode(editor);
  }
}

function toggleBlockFormat(editor: HTMLElement, tagName: string, isActive: boolean): void {
  const targetTagName = isActive ? 'p' : tagName.toLowerCase();
  runNativeCommand(editor, 'formatBlock', `<${targetTagName}>`);
}

function runNativeCommand(editor: HTMLElement, command: string, value?: string): void {
  // execCommand is deprecated, but it is still the only browser API that performs formatting with native undo support.
  editor.ownerDocument.execCommand?.(command, false, value);
}

function removeBlockquote(editor: HTMLElement): void {
  const range = getEditorRange(editor);
  const blockquote = range && findClosestElement(editor, range.startContainer, ['BLOCKQUOTE']);
  if (!blockquote) return;
  const { startContainer, startOffset, endContainer, endOffset } = range;
  blockquote.replaceWith(unwrapBlockContent(blockquote));
  const restoredRange = editor.ownerDocument.createRange();
  restoredRange.setStart(startContainer, startOffset);
  restoredRange.setEnd(endContainer, endOffset);
  restoreRange(editor, restoredRange);
}

function unwrapBlockContent(element: HTMLElement): DocumentFragment {
  const document = element.ownerDocument;
  const fragment = document.createDocumentFragment();
  let paragraph: HTMLParagraphElement | null = null;
  Array.from(element.childNodes).forEach((child) => {
    if (isBlockNode(child)) {
      paragraph = null;
      fragment.appendChild(child);
      return;
    }
    if (!paragraph) paragraph = fragment.appendChild(document.createElement('p'));
    paragraph.appendChild(child);
  });
  return fragment;
}

function isBlockNode(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    [
      'P',
      'DIV',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'UL',
      'OL',
      'PRE',
      'BLOCKQUOTE',
      'HR',
    ].includes(node.tagName)
  );
}

function insertInlineCode(editor: HTMLElement): void {
  const range = getEditorRange(editor);
  if (!range) return;
  const document = editor.ownerDocument;
  const code = document.createElement('code');
  code.textContent = range.collapsed ? zeroWidthSpace : range.toString();
  range.deleteContents();
  range.insertNode(code);
  const codeRange = document.createRange();
  codeRange.selectNodeContents(code);
  if (code.textContent === zeroWidthSpace) codeRange.collapse(false);
  restoreRange(editor, codeRange);
}

function removeInlineCode(editor: HTMLElement): void {
  const range = getEditorRange(editor);
  const code = range && findClosestElement(editor, range.startContainer, ['CODE']);
  if (!code) return;
  const textNode = editor.ownerDocument.createTextNode(code.textContent ?? '');
  code.replaceWith(textNode);
  const textRange = editor.ownerDocument.createRange();
  textRange.selectNodeContents(textNode);
  restoreRange(editor, textRange);
}

export function findLinkHref(editor: HTMLElement, range: Range | null): string {
  const anchor = range && findClosestElement(editor, range.startContainer, ['A']);
  return anchor?.getAttribute('href') ?? '';
}

export function applyLink(editor: HTMLElement, range: Range | null, href: string): void {
  restoreRange(editor, range);
  const currentRange = getEditorRange(editor);
  if (!currentRange) return;
  const existingAnchor = findClosestElement(editor, currentRange.startContainer, ['A']);
  if (existingAnchor && existingAnchor.contains(currentRange.endContainer)) {
    existingAnchor.setAttribute('href', href);
  } else if (currentRange.collapsed) {
    insertLinkWithUrlAsText(editor, currentRange, href);
  } else {
    runNativeCommand(editor, 'createLink', href);
  }
}

function insertLinkWithUrlAsText(editor: HTMLElement, range: Range, href: string): void {
  const anchor = editor.ownerDocument.createElement('a');
  anchor.setAttribute('href', href);
  anchor.textContent = href;
  range.insertNode(anchor);
  range.setStartAfter(anchor);
  range.collapse(true);
  restoreRange(editor, range);
}

export function removeLink(editor: HTMLElement, range: Range | null): void {
  const anchor = range && findClosestElement(editor, range.startContainer, ['A']);
  if (!anchor) return restoreRange(editor, range);
  const anchorContent = Array.from(anchor.childNodes);
  anchor.replaceWith(...anchorContent);
  const contentRange = editor.ownerDocument.createRange();
  contentRange.setStartBefore(anchorContent[0] ?? range.startContainer);
  contentRange.setEndAfter(anchorContent[anchorContent.length - 1] ?? range.startContainer);
  restoreRange(editor, contentRange);
}

export function insertPlainText(editor: HTMLElement, text: string): void {
  runNativeCommand(editor, 'insertText', text);
}
