import {
  createAssistantMessage,
  createUserMessage,
  formatAssistantMessageContent,
  formatFileSize,
  filterCriticalFileNames,
  isUrlSafe,
} from './messageUtils';
import { MessageAuthor } from '../types/MessageAuthor';

describe('messageUtils', () => {
  describe('createAssistantMessage', () => {
    it('should create an assistant message with the provided content', () => {
      const content = 'Hello, how can I help you?';
      const message = createAssistantMessage(content);

      expect(message.role).toBe(MessageAuthor.Assistant);
      expect(message.content).toBe(content);
      expect(message.createdAt).toEqual(expect.any(String));
    });
  });

  describe('createUserMessage', () => {
    it('should create a user message with the provided content, allowAppChanges flag and attachments', () => {
      const content = 'This is a user message';
      const allowAppChanges = true;
      const attachments = [
        {
          name: 'design.pdf',
          mimeType: 'application/pdf',
          size: 1234,
          dataBase64: 'BASE64',
        },
      ];
      const message = createUserMessage(content, allowAppChanges, attachments);

      expect(message.role).toBe(MessageAuthor.User);
      expect(message.content).toBe(content);
      expect(message.allowAppChanges).toBe(allowAppChanges);
      expect(message.createdAt).toEqual(expect.any(String));
      expect(message.attachments).toEqual(attachments);
    });
  });

  describe('filterCriticalFileNames', () => {
    it('returns the critical files when a policy file is changed', () => {
      const filePaths = ['App/config/authorization/policy.xml'];

      expect(filterCriticalFileNames(filePaths)).toEqual(filePaths);
    });

    it('returns the critical files when applicationmetadata.json is changed', () => {
      const filePaths = ['App/config/applicationmetadata.json'];

      expect(filterCriticalFileNames(filePaths)).toEqual(filePaths);
    });

    it('returns an empty array when no critical files are changed', () => {
      expect(filterCriticalFileNames(['App/ui/layouts/layout.json'])).toEqual([]);
    });

    it('returns only the critical files from a mixed set of changes', () => {
      const policyPath = 'App/config/authorization/policy.xml';

      expect(filterCriticalFileNames(['App/ui/layouts/layout.json', policyPath])).toEqual([
        policyPath,
      ]);
    });

    it('matches critical file names case-insensitively', () => {
      const filePaths = ['App/config/authorization/Policy.XML'];

      expect(filterCriticalFileNames(filePaths)).toEqual(filePaths);
    });
  });

  describe('formatFileSize', () => {
    it.each([
      { bytes: 0, expected: '0 B' },
      { bytes: 500, expected: '500 B' },
      { bytes: 1023, expected: '1023 B' },
      { bytes: 1024, expected: '1.0 KB' },
      { bytes: 1536, expected: '1.5 KB' },
      { bytes: 1024 * 1024, expected: '1.0 MB' },
      { bytes: 5 * 1024 * 1024, expected: '5.0 MB' },
    ])('formats $bytes bytes as "$expected"', ({ bytes, expected }) => {
      expect(formatFileSize(bytes)).toBe(expected);
    });
  });

  describe('isUrlSafe', () => {
    it.each([
      { url: 'https://example.com', expected: true },
      { url: 'http://example.com/path?query=1', expected: true },
      { url: 'javascript:alert(1)', expected: false },
      { url: 'data:text/html,<script>', expected: false },
      { url: 'ftp://example.com', expected: false },
      { url: 'file:///etc/passwd', expected: false },
      { url: 'not a url', expected: false },
      { url: '', expected: false },
    ])('returns $expected for "$url"', ({ url, expected }) => {
      expect(isUrlSafe(url)).toBe(expected);
    });
  });

  describe('formatAssistantMessageContent', () => {
    it('wraps plain text in a paragraph', () => {
      expect(formatAssistantMessageContent('Hello world')).toBe('<p>Hello world</p>');
    });

    it('converts single line breaks within a paragraph to <br>', () => {
      expect(formatAssistantMessageContent('line one\nline two')).toBe(
        '<p>line one<br>line two</p>',
      );
    });

    it('splits blank-line separated blocks into separate paragraphs', () => {
      expect(formatAssistantMessageContent('first\n\nsecond')).toBe('<p>first</p>\n<p>second</p>');
    });

    it('converts headings', () => {
      const result = formatAssistantMessageContent('# H1\n\n## H2\n\n### H3');
      expect(result).toContain('<h1>H1</h1>');
      expect(result).toContain('<h2>H2</h2>');
      expect(result).toContain('<h3>H3</h3>');
    });

    it('converts bold and italic', () => {
      const result = formatAssistantMessageContent('**bold** and *italic*');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('converts bullet lists', () => {
      const result = formatAssistantMessageContent('- one\n- two');
      expect(result).toMatch(/<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
    });

    it('converts numbered lists', () => {
      const result = formatAssistantMessageContent('1. one\n2. two');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>one</li>');
      expect(result).toContain('<li>two</li>');
      expect(result).toContain('</ol>');
    });

    it('converts inline code', () => {
      expect(formatAssistantMessageContent('use `npm test`')).toContain('<code>npm test</code>');
    });

    it('preserves fenced code blocks and escapes html inside', () => {
      const input = '```ts\nconst x = <T>() => 1;\n```';
      const result = formatAssistantMessageContent(input);
      expect(result).toContain('<pre>');
      expect(result).toContain('const x = &lt;T&gt;() =&gt; 1;');
    });

    it('converts markdown links to anchor tags', () => {
      const result = formatAssistantMessageContent('[Altinn](https://altinn.no)');
      expect(result).toContain('<a href="https://altinn.no">Altinn</a>');
    });

    it('strips "Kilder" sections and standalone [Source: ...] lines', () => {
      const input = 'Answer text.\n\nKilder\n[Source: doc1]\n[Source: doc2]';
      const result = formatAssistantMessageContent(input);
      expect(result).not.toContain('Kilder');
      expect(result).not.toContain('Source:');
      expect(result).toContain('Answer text.');
    });

    it('sanitizes script tags to prevent XSS', () => {
      const result = formatAssistantMessageContent('hello <script>alert(1)</script>');
      expect(result).not.toContain('<script>');
    });

    it('returns an empty string for empty input', () => {
      expect(formatAssistantMessageContent('')).toBe('');
    });

    it('removes event handler attributes from inline html', () => {
      const result = formatAssistantMessageContent('<img src=x onerror=alert(1)>');
      expect(result).not.toContain('onerror');
    });

    it('removes javascript: urls from links', () => {
      const result = formatAssistantMessageContent('[click](javascript:alert(1))');
      expect(result).not.toContain('javascript:');
    });

    it('escapes html inside inline code', () => {
      const result = formatAssistantMessageContent('`<b>raw</b>`');
      expect(result).toContain('<code>&lt;b&gt;raw&lt;/b&gt;</code>');
    });
  });
});
