import { Heading } from '@digdir/designsystemet-react';
import DOMPurify from 'dompurify';
import parseHtmlToReact, { domToReact } from 'html-react-parser';
import { marked } from 'marked';
import { mangle } from 'marked-mangle';
import type {
  DOMNode,
  Element as ReactParserElement,
  HTMLReactParserOptions,
} from 'html-react-parser';

marked.use(mangle());

const TRUSTED_DOMAINS = ['local.altinn', 'altinn.no', 'altinn.cloud', 'basefarm.net'];

/**
 * Determines whether a link points off-site. Only absolute or protocol-relative URLs can be
 * external; relative paths, `mailto:`, and `#anchor` links stay internal. For candidate URLs the
 * hostname is parsed and compared exactly (or as a subdomain) against the trusted list, so that
 * spoofed hosts like `https://altinn.no.evil.com` are correctly treated as external. URLs that look
 * absolute but fail to parse are treated as external/unsafe.
 */
function isExternalLink(url: string, baseURI: string): boolean {
  if (!/^(https?:)?\/\//i.test(url)) {
    return false;
  }

  let hostname: string;
  try {
    hostname = new URL(url, baseURI).hostname.toLowerCase();
  } catch {
    return true;
  }

  return !TRUSTED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof Element)) {
    return;
  }

  if (node['tagName'] === 'A') {
    node.classList.add('altinnLink');
    const url = node.getAttribute('href') || '';

    if (isExternalLink(url, node.baseURI)) {
      node.classList.add('target-external');
    } else {
      node.classList.add('target-internal');
    }

    if (node.classList.contains('same-window')) {
      node.setAttribute('target', '_self');
    } else {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }
});

export function isElement(node: DOMNode): node is ReactParserElement {
  return node.type === 'tag';
}

/**
 * Extension point for {@link parseAndCleanText}. Runs before the built-in element handling; return a
 * value to override the default rendering of a node, or `undefined` to fall through to the built-in
 * handling. Receives the composed parser options so children can be recursed with
 * `domToReact(node.children, options)`.
 */
export type ParserReplace = (
  domNode: DOMNode,
  options: HTMLReactParserOptions,
) => ReturnType<NonNullable<HTMLReactParserOptions['replace']>>;

/**
 * Parses a markdown/HTML string into sanitized React nodes. Markdown is rendered with `marked`,
 * sanitized with `DOMPurify`, and converted to React elements with `html-react-parser`. Headings
 * become design-system `Heading` components and paragraphs are normalized.
 *
 * Pass `replace` to inject app-specific node handling (e.g. internal links) without coupling this
 * library to the consuming app.
 */
export function parseAndCleanText(
  text: string | undefined,
  options?: { replace?: ParserReplace },
): ReturnType<typeof parseHtmlToReact> | null {
  if (typeof text !== 'string') {
    return null;
  }

  const parserOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      const injected = options?.replace?.(domNode, parserOptions);
      if (injected !== undefined) {
        return injected;
      }

      /**
       * The root element from the `marked.parse` will in many cases result in a `p` tag, which is not what we want,
       * since the text might already be used in f.ex `p`, `button`, `label` tags etc.
       * Span is a better solution, although not perfect, as block level elements are not valid children (f.ex h1), but this should be less frequent.
       */
      if (
        isElement(domNode) &&
        !domNode.parent &&
        !domNode.nextSibling &&
        !domNode.previousSibling &&
        domNode.name === 'p'
      ) {
        domNode.name = 'span';
        return;
      }

      /**
       * Replace p tag with Paragraph component from design system
       */
      if (isElement(domNode) && domNode.name === 'p') {
        return (
          <p style={{ margin: 0 }}>{domToReact(domNode.children as DOMNode[], parserOptions)}</p>
        );
      }
      /**
       * Replace h1-h6 tags with Heading component from design system
       */
      if (isElement(domNode) && domNode.name === 'h1') {
        return (
          <Heading level={1} data-size='lg'>
            {domToReact(domNode.children as DOMNode[], parserOptions)}
          </Heading>
        );
      }
      if (isElement(domNode) && domNode.name === 'h2') {
        return (
          <Heading level={2} data-size='md'>
            {domToReact(domNode.children as DOMNode[], parserOptions)}
          </Heading>
        );
      }
      if (isElement(domNode) && domNode.name === 'h3') {
        return (
          <Heading level={3} data-size='sm'>
            {domToReact(domNode.children as DOMNode[], parserOptions)}
          </Heading>
        );
      }
      if (isElement(domNode) && domNode.name === 'h4') {
        return (
          <Heading level={4} data-size='xs'>
            {domToReact(domNode.children as DOMNode[], parserOptions)}
          </Heading>
        );
      }
      if (isElement(domNode) && domNode.name === 'h5') {
        return (
          <Heading level={5} data-size='xs'>
            {domToReact(domNode.children as DOMNode[], parserOptions)}
          </Heading>
        );
      }
      if (isElement(domNode) && domNode.name === 'h6') {
        return (
          <Heading level={6} data-size='xs'>
            {domToReact(domNode.children as DOMNode[], parserOptions)}
          </Heading>
        );
      }
    },
  };

  const dirty = marked.parse(text, { async: false });
  const clean = DOMPurify.sanitize(dirty);
  return parseHtmlToReact(clean.toString().trim(), parserOptions);
}
