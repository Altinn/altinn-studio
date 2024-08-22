import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import DOMPurify from 'dompurify';
import parseHtmlToReact, { domToReact } from 'html-react-parser';
import { marked } from 'marked';
import { mangle } from 'marked-mangle';
import type { DOMNode, Element, HTMLReactParserOptions } from 'html-react-parser';

import { LinkToPotentialNode } from 'src/components/form/LinkToPotentialNode';
import { LinkToPotentialPage } from 'src/components/form/LinkToPotentialPage';
import { cachedFunction } from 'src/utils/cachedFunction';

marked.use(mangle());

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.classList.add('altinnLink');
    const url = node.getAttribute('href') || '';
    if (url.startsWith('http') && !url.match(/(local\.altinn|altinn\.no|altinn\.cloud|basefarm\.net)/)) {
      node.classList.add('target-external');
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      node.classList.add('target-internal');
    }

    if (node.classList.contains('same-window')) {
      node.setAttribute('target', '_self');
    } else {
      node.setAttribute('target', '_blank');
    }
  }
});

export const parseAndCleanText = cachedFunction(
  (text: string | undefined) => {
    if (typeof text !== 'string') {
      return null;
    }

    const dirty = marked.parse(text, { async: false });
    const clean = DOMPurify.sanitize(dirty);
    return parseHtmlToReact(clean.toString().trim(), parserOptions);
  },
  { max: 5000 },
  (text) => text ?? null,
);

function isElement(node: DOMNode): node is Element {
  return node.type === 'tag';
}

const parserOptions: HTMLReactParserOptions = {
  replace: (domNode) => {
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
      return React.createElement(
        'p',
        { style: { margin: 0 } },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    /**
     * Replace h1-h6 tags with Heading component from design system
     */
    if (isElement(domNode) && domNode.name === 'h1') {
      return React.createElement(
        Heading,
        { level: 1, size: 'large' },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    if (isElement(domNode) && domNode.name === 'h2') {
      return React.createElement(
        Heading,
        { level: 2, size: 'medium' },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    if (isElement(domNode) && domNode.name === 'h3') {
      return React.createElement(
        Heading,
        { level: 3, size: 'small' },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    if (isElement(domNode) && domNode.name === 'h4') {
      return React.createElement(
        Heading,
        { level: 4, size: 'xsmall' },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    if (isElement(domNode) && domNode.name === 'h5') {
      return React.createElement(
        Heading,
        { level: 5, size: 'xsmall' },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    if (isElement(domNode) && domNode.name === 'h6') {
      return React.createElement(
        Heading,
        { level: 6, size: 'xsmall' },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    /**
     * Internal links
     */
    if (isElement(domNode) && domNode.name === 'a' && domNode.attribs['data-link-type'] === 'LinkToPotentialNode') {
      return React.createElement(
        LinkToPotentialNode,
        { to: domNode.attribs.href, preventScrollReset: true },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
    if (isElement(domNode) && domNode.name === 'a' && domNode.attribs['data-link-type'] === 'LinkToPotentialPage') {
      return React.createElement(
        LinkToPotentialPage,
        { to: domNode.attribs.href, preventScrollReset: true },
        domToReact(domNode.children as DOMNode[], parserOptions),
      );
    }
  },
};
