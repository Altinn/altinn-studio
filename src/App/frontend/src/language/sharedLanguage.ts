import React from 'react';

import { isElement, parseAndCleanText as baseParseAndCleanText, type ParserReplace } from '@app/form-component';
import { domToReact } from 'html-react-parser';
import type { DOMNode } from 'html-react-parser';

import { LinkToPotentialNode } from 'src/components/form/LinkToPotentialNode';
import { LinkToPotentialPage } from 'src/components/form/LinkToPotentialPage';
import { preventFocusAndScrollResetOptions } from 'src/features/navigation/navigationOptions';
import { cachedFunction } from 'src/utils/cachedFunction';

/**
 * Renders the app-specific internal links (`LinkToPotentialNode`/`LinkToPotentialPage`) that the
 * markdown/HTML parser in `@app/form-component` cannot know about, as it must stay free of app
 * routing and context. Injected into {@link baseParseAndCleanText}; returning `undefined` lets the
 * library apply its built-in element handling (headings, paragraphs, …).
 */
const replaceInternalLinks: ParserReplace = (domNode, options) => {
  /**
   * Internal links
   */
  if (isElement(domNode) && domNode.name === 'a' && domNode.attribs['data-link-type'] === 'LinkToPotentialNode') {
    return React.createElement(
      LinkToPotentialNode,
      {
        to: domNode.attribs.href,
        ...preventFocusAndScrollResetOptions,
      },
      domToReact(domNode.children as DOMNode[], options),
    );
  }
  if (isElement(domNode) && domNode.name === 'a' && domNode.attribs['data-link-type'] === 'LinkToPotentialPage') {
    return React.createElement(
      LinkToPotentialPage,
      {
        to: domNode.attribs.href,
        ...preventFocusAndScrollResetOptions,
      },
      domToReact(domNode.children as DOMNode[], options),
    );
  }
};

export const parseAndCleanText = cachedFunction(
  (text: string | undefined) => baseParseAndCleanText(text, { replace: replaceInternalLinks }),
  { max: 5000 },
  (text) => text ?? null,
);
