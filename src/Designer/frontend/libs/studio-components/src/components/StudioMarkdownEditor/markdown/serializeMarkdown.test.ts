import { parseMarkdown } from './parseMarkdown';
import { serializeMarkdown } from './serializeMarkdown';
import type { BlockNode, InlineNode } from './types';

describe('serializeMarkdown', () => {
  it('Serializes inline formatting', () => {
    const blocks: BlockNode[] = [
      paragraph([
        { type: 'bold', children: [text('bold')] },
        text(' '),
        { type: 'italic', children: [text('italic')] },
        text(' '),
        { type: 'strikethrough', children: [text('gone')] },
        text(' '),
        { type: 'inlineCode', text: 'code' },
        text(' '),
        { type: 'link', href: 'https://altinn.no', children: [text('link')] },
      ]),
    ];
    expect(serializeMarkdown(blocks)).toBe(
      '**bold** *italic* ~~gone~~ `code` [link](https://altinn.no)',
    );
  });

  it('Moves whitespace at the edges of formatting outside the delimiters', () => {
    const blocks = [paragraph([text('a'), { type: 'bold', children: [text(' b ')] }, text('c')])];
    expect(serializeMarkdown(blocks)).toBe('a **b** c');
  });

  it('Serializes block elements separated by blank lines', () => {
    const blocks: BlockNode[] = [
      { type: 'heading', level: 2, children: [text('Heading')] },
      paragraph([text('Text')]),
      { type: 'blockquote', children: [paragraph([text('One')]), paragraph([text('Two')])] },
      { type: 'codeBlock', language: 'json', text: '{}' },
      { type: 'thematicBreak' },
    ];
    expect(serializeMarkdown(blocks)).toBe(
      '## Heading\n\nText\n\n> One\n>\n> Two\n\n```json\n{}\n```\n\n---',
    );
  });

  it('Serializes nested lists with indentation', () => {
    const blocks: BlockNode[] = [
      {
        type: 'list',
        ordered: true,
        start: 1,
        items: [
          {
            children: [
              paragraph([text('One')]),
              {
                type: 'list',
                ordered: false,
                start: 1,
                items: [{ children: [paragraph([text('Nested')])] }],
              },
            ],
          },
          { children: [paragraph([text('Two')])] },
        ],
      },
    ];
    expect(serializeMarkdown(blocks)).toBe('1. One\n   - Nested\n2. Two');
  });

  it('Uses a different marker for adjacent lists so they stay separate', () => {
    const list: BlockNode = {
      type: 'list',
      ordered: false,
      start: 1,
      items: [{ children: [paragraph([text('Item')])] }],
    };
    const markdown = serializeMarkdown([list, list]);
    expect(markdown).toBe('- Item\n\n* Item');
    expect(parseMarkdown(markdown)).toEqual([list, list]);
  });

  it('Serializes a hard line break with a backslash', () => {
    expect(serializeMarkdown([paragraph([text('a'), { type: 'lineBreak' }, text('b')])])).toBe(
      'a\\\nb',
    );
  });

  it('Omits empty paragraphs', () => {
    expect(
      serializeMarkdown([paragraph([]), paragraph([text('Text')]), paragraph([text('  ')])]),
    ).toBe('Text');
  });

  it('Uses a longer fence when the code contains backticks', () => {
    expect(serializeMarkdown([{ type: 'codeBlock', language: '', text: '```' }])).toBe(
      '````\n```\n````',
    );
  });

  it('Wraps link destinations with spaces in angle brackets', () => {
    const blocks = [paragraph([{ type: 'link', href: 'a b', children: [text('Link')] }])];
    expect(serializeMarkdown(blocks)).toBe('[Link](<a b>)');
  });
});

describe('Round trip', () => {
  it.each([
    '*not italic*',
    '**not bold**',
    '~~not struck~~',
    '`not code`',
    '[not](a link)',
    '# not a heading',
    '> not a quote',
    '- not a list',
    '+ not a list',
    '1. not a list',
    '2024) not a list',
    '---',
    '___',
    '```',
    '~~~',
    '_leading underscore',
    'snake_case stays readable',
    'ca. ~5',
    'C:\\path\\to\\file',
    'Ends with backslash \\',
    'Text\n# on the next line',
    'Two spaces  \nare not a line break',
    'Special < > & " \' characters',
  ])('Keeps the text %p unchanged', (value) => {
    const blocks = [paragraph([text(value)])];
    expect(parseMarkdown(serializeMarkdown(blocks))).toEqual([
      paragraph([text(value.replace(/ +\n/g, '\n'))]),
    ]);
  });

  it('Does not escape underscores inside words', () => {
    expect(serializeMarkdown([paragraph([text('snake_case')])])).toBe('snake_case');
  });

  it.each([
    '# Heading\n\nParagraph with **bold**, *italic*, ~~strike~~, `code` and [link](https://altinn.no).',
    '- One\n- Two\n  1. Nested\n  2. Nested\n- Three',
    '> Quote\n>\n> - Item',
    '```ts\nconst a = 1;\n```',
    '***bold italic***',
    'Line\\\nbreak',
    '3. Three\n4. Four',
  ])('Serializes %p to the same markdown after parsing', (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });
});

function text(value: string): InlineNode {
  return { type: 'text', text: value };
}

function paragraph(children: InlineNode[]): BlockNode {
  return { type: 'paragraph', children };
}
