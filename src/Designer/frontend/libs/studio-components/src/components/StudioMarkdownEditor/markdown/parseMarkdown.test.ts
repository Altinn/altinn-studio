import { parseInline, parseMarkdown } from './parseMarkdown';
import type { BlockNode, InlineNode } from './types';

describe('parseMarkdown', () => {
  it('Returns an empty list for an empty string', () => {
    expect(parseMarkdown('')).toEqual([]);
  });

  it('Parses paragraphs separated by blank lines', () => {
    expect(parseMarkdown('First\n\nSecond')).toEqual([paragraph('First'), paragraph('Second')]);
  });

  it('Keeps soft line breaks inside a paragraph', () => {
    expect(parseMarkdown('First line\nSecond line')).toEqual([
      paragraph('First line\nSecond line'),
    ]);
  });

  it.each([
    ['Two trailing spaces', 'First  \nSecond'],
    ['A backslash', 'First\\\nSecond'],
  ])('Parses a hard line break written with %s', (_, markdown) => {
    const expected: BlockNode = {
      type: 'paragraph',
      children: [text('First'), { type: 'lineBreak' }, text('Second')],
    };
    expect(parseMarkdown(markdown)).toEqual([expected]);
  });

  it.each([1, 2, 3, 4, 5, 6])('Parses a heading of level %d', (level) => {
    const markdown = `${'#'.repeat(level)} Heading`;
    expect(parseMarkdown(markdown)).toEqual([
      { type: 'heading', level, children: [text('Heading')] },
    ]);
  });

  it('Does not parse a hash without a following space as a heading', () => {
    expect(parseMarkdown('#hashtag')).toEqual([paragraph('#hashtag')]);
  });

  it('Removes the closing sequence of a heading', () => {
    expect(parseMarkdown('## Heading ##')).toEqual([
      { type: 'heading', level: 2, children: [text('Heading')] },
    ]);
  });

  it('Parses a block quote with nested blocks', () => {
    expect(parseMarkdown('> # Title\n> Quote\n>\n> - Item')).toEqual([
      {
        type: 'blockquote',
        children: [
          { type: 'heading', level: 1, children: [text('Title')] },
          paragraph('Quote'),
          bulletList(['Item']),
        ],
      },
    ]);
  });

  it('Parses a fenced code block without interpreting its content', () => {
    expect(parseMarkdown('```ts\nconst a = **b**;\n\n# not a heading\n```')).toEqual([
      { type: 'codeBlock', language: 'ts', text: 'const a = **b**;\n\n# not a heading' },
    ]);
  });

  it('Parses an unclosed code block to the end of the document', () => {
    expect(parseMarkdown('```\ncode')).toEqual([{ type: 'codeBlock', language: '', text: 'code' }]);
  });

  it.each(['---', '***', '___', '- - -'])('Parses %s as a thematic break', (markdown) => {
    expect(parseMarkdown(markdown)).toEqual([{ type: 'thematicBreak' }]);
  });

  it.each(['-', '*', '+'])('Parses a bullet list with the %s marker', (marker) => {
    expect(parseMarkdown(`${marker} One\n${marker} Two`)).toEqual([bulletList(['One', 'Two'])]);
  });

  it('Parses an ordered list and keeps its start number', () => {
    expect(parseMarkdown('3. Three\n4. Four')).toEqual([
      {
        type: 'list',
        ordered: true,
        start: 3,
        items: [{ children: [paragraph('Three')] }, { children: [paragraph('Four')] }],
      },
    ]);
  });

  it('Parses nested lists', () => {
    expect(parseMarkdown('- One\n  1. Nested\n- Two')).toEqual([
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          {
            children: [
              paragraph('One'),
              {
                type: 'list',
                ordered: true,
                start: 1,
                items: [{ children: [paragraph('Nested')] }],
              },
            ],
          },
          { children: [paragraph('Two')] },
        ],
      },
    ]);
  });

  it('Continues a list across blank lines between items', () => {
    expect(parseMarkdown('1. One\n\n2. Two')).toEqual([
      {
        type: 'list',
        ordered: true,
        start: 1,
        items: [{ children: [paragraph('One')] }, { children: [paragraph('Two')] }],
      },
    ]);
  });

  it('Keeps indented paragraphs within the list item', () => {
    expect(parseMarkdown('- One\n\n  More\n- Two')).toEqual([
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          { children: [paragraph('One'), paragraph('More')] },
          { children: [paragraph('Two')] },
        ],
      },
    ]);
  });

  it('Adds lazy continuation lines to the list item', () => {
    expect(parseMarkdown('- One\ncontinued')).toEqual([bulletList(['One\ncontinued'])]);
  });

  it('Starts a new list when the bullet character changes', () => {
    expect(parseMarkdown('- One\n\n* Two')).toEqual([bulletList(['One']), bulletList(['Two'])]);
  });

  it('Ends a list at an unindented paragraph after a blank line', () => {
    expect(parseMarkdown('- One\n\nParagraph')).toEqual([
      bulletList(['One']),
      paragraph('Paragraph'),
    ]);
  });

  it('Lets block elements interrupt a paragraph', () => {
    expect(parseMarkdown('Text\n# Heading\n- Item')).toEqual([
      paragraph('Text'),
      { type: 'heading', level: 1, children: [text('Heading')] },
      bulletList(['Item']),
    ]);
  });

  it('Normalizes Windows line endings', () => {
    expect(parseMarkdown('First\r\n\r\nSecond')).toEqual([paragraph('First'), paragraph('Second')]);
  });
});

describe('parseInline', () => {
  it.each<[string, string, InlineNode[]]>([
    ['bold with asterisks', '**bold**', [{ type: 'bold', children: [text('bold')] }]],
    ['bold with underscores', '__bold__', [{ type: 'bold', children: [text('bold')] }]],
    ['italic with asterisks', '*italic*', [{ type: 'italic', children: [text('italic')] }]],
    ['italic with underscores', '_italic_', [{ type: 'italic', children: [text('italic')] }]],
    ['strikethrough', '~~gone~~', [{ type: 'strikethrough', children: [text('gone')] }]],
    ['inline code', '`code`', [{ type: 'inlineCode', text: 'code' }]],
    ['padded inline code', '`` `tick` ``', [{ type: 'inlineCode', text: '`tick`' }]],
    [
      'a link',
      '[Altinn](https://altinn.no)',
      [{ type: 'link', href: 'https://altinn.no', children: [text('Altinn')] }],
    ],
    [
      'a link with a title',
      '[Altinn](https://altinn.no "Title")',
      [{ type: 'link', href: 'https://altinn.no', children: [text('Altinn')] }],
    ],
    [
      'a link with an angle bracket destination',
      '[Link](<with space>)',
      [{ type: 'link', href: 'with space', children: [text('Link')] }],
    ],
    [
      'a link with parentheses in the destination',
      '[Wiki](https://wiki.org/a_(b))',
      [{ type: 'link', href: 'https://wiki.org/a_(b)', children: [text('Wiki')] }],
    ],
  ])('Parses %s', (_, markdown, expected) => {
    expect(parseInline(markdown)).toEqual(expected);
  });

  it('Parses nested bold and italic written with three asterisks', () => {
    expect(parseInline('***both***')).toEqual([
      { type: 'bold', children: [{ type: 'italic', children: [text('both')] }] },
    ]);
  });

  it('Parses bold nested in italic ending with three asterisks', () => {
    expect(parseInline('*a **b***')).toEqual([
      { type: 'italic', children: [text('a '), { type: 'bold', children: [text('b')] }] },
    ]);
  });

  it('Parses italic directly followed by bold', () => {
    expect(parseInline('*a***b**')).toEqual([
      { type: 'italic', children: [text('a')] },
      { type: 'bold', children: [text('b')] },
    ]);
  });

  it('Parses formatting inside link text', () => {
    expect(parseInline('[**bold** link](/path)')).toEqual([
      {
        type: 'link',
        href: '/path',
        children: [{ type: 'bold', children: [text('bold')] }, text(' link')],
      },
    ]);
  });

  it.each([
    'snake_case_name',
    '2 * 3 * 4',
    '** not bold **',
    'a ~~ b',
    '[not a link]',
    '`unclosed',
  ])('Keeps %s as plain text', (markdown) => {
    expect(parseInline(markdown)).toEqual([text(markdown)]);
  });

  it('Resolves backslash escapes', () => {
    expect(parseInline('\\*not italic\\* \\\\ \\a')).toEqual([text('*not italic* \\ \\a')]);
  });

  it('Does not parse formatting inside inline code', () => {
    expect(parseInline('`**code**`')).toEqual([{ type: 'inlineCode', text: '**code**' }]);
  });
});

function text(value: string): InlineNode {
  return { type: 'text', text: value };
}

function paragraph(value: string): BlockNode {
  return { type: 'paragraph', children: [text(value)] };
}

function bulletList(items: string[]): BlockNode {
  return {
    type: 'list',
    ordered: false,
    start: 1,
    items: items.map((item) => ({ children: [paragraph(item)] })),
  };
}
