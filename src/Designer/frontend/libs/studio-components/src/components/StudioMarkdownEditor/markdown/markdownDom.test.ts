import { isSafeHref, parseDomToBlocks, renderBlocksToDom } from './markdownDom';
import { parseMarkdown } from './parseMarkdown';
import { serializeMarkdown } from './serializeMarkdown';

describe('markdownDom', () => {
  describe('renderBlocksToDom', () => {
    it('Renders markdown as semantic HTML elements', () => {
      const container = renderMarkdown(
        '# Title\n\n**Bold** *italic* ~~gone~~ `code` [link](https://altinn.no)\n\n- Item\n\n> Quote\n\n```\ncode\n```\n\n---',
      );
      expect(container.innerHTML).toBe(
        '<h1>Title</h1>' +
          '<p><strong>Bold</strong> <em>italic</em> <s>gone</s> <code>code</code> <a href="https://altinn.no">link</a></p>' +
          '<ul><li>Item</li></ul>' +
          '<blockquote><p>Quote</p></blockquote>' +
          '<pre>code</pre>' +
          '<hr>',
      );
    });

    it('Renders an empty paragraph when there is no content', () => {
      expect(renderMarkdown('').innerHTML).toBe('<p><br></p>');
    });

    it('Renders text as text, not as HTML', () => {
      const container = renderMarkdown('<img src=x onerror="alert(1)">');
      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toBe('<img src=x onerror="alert(1)">');
    });

    it('Does not render unsafe link destinations as href', () => {
      const container = renderMarkdown('[Click](javascript:alert(1))');
      const anchor = container.querySelector('a');
      expect(anchor).not.toHaveAttribute('href');
      expect(parseDomToBlocks(container)).toEqual(parseMarkdown('[Click](javascript:alert(1))'));
    });

    it('Keeps the start number of ordered lists', () => {
      expect(renderMarkdown('5. Five').innerHTML).toBe('<ol start="5"><li>Five</li></ol>');
    });
  });

  describe('parseDomToBlocks', () => {
    it.each([
      ['<p><b>a</b> <i>b</i> <strike>c</strike> <del>d</del></p>', '**a** *b* ~~c~~ ~~d~~'],
      ['<div>First</div><div>Second</div>', 'First\n\nSecond'],
      ['Loose text<div>Block</div>', 'Loose text\n\nBlock'],
      ['<p>Line<br>break<br></p>', 'Line\\\nbreak'],
      ['<p><strong>a</strong><strong>b</strong></p>', '**ab**'],
      ['<p><strong>a <strong>b</strong></strong></p>', '**a b**'],
      ['<p><strong> </strong>text</p>', 'text'],
      ['<p>a&nbsp;b</p>', 'a b'],
      ['<p><span style="font-weight: bold">a</span></p>', '**a**'],
      ['<p><u>underlined</u></p>', 'underlined'],
      ['<ul><li>One</li><ul><li>Nested</li></ul></ul>', '- One\n  - Nested'],
      ['<ul><li><p>One</p><ul><li>Nested</li></ul></li></ul>', '- One\n  - Nested'],
      ['<blockquote>Quote<br>More</blockquote>', '> Quote\\\n> More'],
      ['<pre>line 1<br>line 2</pre>', '```\nline 1\nline 2\n```'],
      ['<pre data-language="ts">const a = 1;\n</pre>', '```ts\nconst a = 1;\n```'],
      [
        '<p><a href="https://altinn.no"><b>bold</b> link</a></p>',
        '[**bold** link](https://altinn.no)',
      ],
      ['<p>Text with * and _</p>', 'Text with \\* and \\_'],
      ['<p><br></p>', ''],
    ])('Converts %s to %p', (html, expectedMarkdown) => {
      const container = document.createElement('div');
      container.innerHTML = html;
      expect(serializeMarkdown(parseDomToBlocks(container))).toBe(expectedMarkdown);
    });

    it.each([
      '# Heading\n\nParagraph with **bold**, *italic*, ~~strike~~, `code` and [link](https://altinn.no).',
      '- One\n- Two\n  1. Nested\n  2. Nested\n- Three',
      '> Quote\n>\n> - Item',
      '```ts\nconst a = 1;\n```',
      'First line\nSecond line',
      '1. One\n\n   Second paragraph\n2. Two',
    ])('Converts the rendered DOM of %p back to the same markdown', (markdown) => {
      expect(serializeMarkdown(parseDomToBlocks(renderMarkdown(markdown)))).toBe(markdown);
    });
  });

  describe('isSafeHref', () => {
    it.each([
      'https://altinn.no',
      'http://altinn.no',
      'mailto:a@b.no',
      'tel:12345678',
      '/path',
      '#anchor',
      'page',
    ])('Accepts %s', (href) => {
      expect(isSafeHref(href)).toBe(true);
    });

    it.each([
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      ' javascript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
    ])('Rejects %p', (href) => {
      expect(isSafeHref(href)).toBe(false);
    });
  });
});

function renderMarkdown(markdown: string): HTMLDivElement {
  const container = document.createElement('div');
  container.appendChild(renderBlocksToDom(parseMarkdown(markdown), document));
  return container;
}
