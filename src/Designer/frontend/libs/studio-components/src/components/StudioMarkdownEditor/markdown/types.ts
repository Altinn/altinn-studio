export type TextNode = Readonly<{ type: 'text'; text: string }>;
export type BoldNode = Readonly<{ type: 'bold'; children: InlineNode[] }>;
export type ItalicNode = Readonly<{ type: 'italic'; children: InlineNode[] }>;
export type StrikethroughNode = Readonly<{ type: 'strikethrough'; children: InlineNode[] }>;
export type InlineCodeNode = Readonly<{ type: 'inlineCode'; text: string }>;
export type LinkNode = Readonly<{ type: 'link'; href: string; children: InlineNode[] }>;
export type LineBreakNode = Readonly<{ type: 'lineBreak' }>;

export type FormattingNode = BoldNode | ItalicNode | StrikethroughNode | LinkNode;
export type InlineNode = TextNode | FormattingNode | InlineCodeNode | LineBreakNode;

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type ParagraphNode = Readonly<{ type: 'paragraph'; children: InlineNode[] }>;
export type HeadingNode = Readonly<{
  type: 'heading';
  level: HeadingLevel;
  children: InlineNode[];
}>;
export type BlockquoteNode = Readonly<{ type: 'blockquote'; children: BlockNode[] }>;
export type CodeBlockNode = Readonly<{ type: 'codeBlock'; language: string; text: string }>;
export type ThematicBreakNode = Readonly<{ type: 'thematicBreak' }>;
export type ListItemNode = Readonly<{ children: BlockNode[] }>;
export type ListNode = Readonly<{
  type: 'list';
  ordered: boolean;
  start: number;
  items: ListItemNode[];
}>;

export type BlockNode =
  ParagraphNode | HeadingNode | BlockquoteNode | CodeBlockNode | ThematicBreakNode | ListNode;
