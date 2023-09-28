import React from 'react';

import { Heading } from '@digdir/design-system-react';
import DOMPurify from 'dompurify';
import parseHtmlToReact, { domToReact } from 'html-react-parser';
import { marked } from 'marked';
import { mangle } from 'marked-mangle';
import type { DOMNode, Element, HTMLReactParserOptions } from 'html-react-parser';

import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IAltinnOrgs, IApplication } from 'src/types/shared';

marked.use(mangle());

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
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

export const getParsedLanguageFromText = (
  text: string | undefined,
  purifyOptions?: {
    allowedTags?: string[];
    allowedAttr?: string[];
    disallowedTags?: string[];
  },
  inline = true,
) => {
  const dirty = marked.parse(text || '');
  const actualOptions: DOMPurify.Config = {};
  if (purifyOptions?.allowedTags) {
    actualOptions.ALLOWED_TAGS = purifyOptions.allowedTags;
  }

  if (purifyOptions?.allowedAttr) {
    actualOptions.ALLOWED_ATTR = purifyOptions.allowedAttr;
  }

  if (purifyOptions?.disallowedTags) {
    actualOptions.FORBID_TAGS = purifyOptions.disallowedTags;
  }

  const clean = DOMPurify.sanitize(dirty, actualOptions);
  return parseHtmlToReact(clean.toString().trim(), getParseOptions(inline));
};

function getParseOptions(inline = true): HTMLReactParserOptions {
  return {
    replace: (domNode) => {
      if (inline) {
        replaceRootTag(domNode);
      }
      return replaceElements(domNode, getParseOptions(inline));
    },
  };
}

function isElement(node: DOMNode): node is Element {
  return node.type === 'tag';
}

function replaceElements(domNode: DOMNode, parserOptions: HTMLReactParserOptions) {
  if (isElement(domNode) && domNode.name === 'h1') {
    return React.createElement(Heading, { level: 1, size: 'large' }, domToReact(domNode.children, parserOptions));
  }
  if (isElement(domNode) && domNode.name === 'h2') {
    return React.createElement(Heading, { level: 2, size: 'medium' }, domToReact(domNode.children, parserOptions));
  }
  if (isElement(domNode) && domNode.name === 'h3') {
    return React.createElement(Heading, { level: 3, size: 'small' }, domToReact(domNode.children, parserOptions));
  }
  if (isElement(domNode) && domNode.name === 'h4') {
    return React.createElement(Heading, { level: 4, size: 'xsmall' }, domToReact(domNode.children, parserOptions));
  }
  if (isElement(domNode) && domNode.name === 'h5') {
    return React.createElement(Heading, { level: 5, size: 'xsmall' }, domToReact(domNode.children, parserOptions));
  }
  if (isElement(domNode) && domNode.name === 'h6') {
    return React.createElement(Heading, { level: 6, size: 'xsmall' }, domToReact(domNode.children, parserOptions));
  }
}

const replaceRootTag = (domNode: DOMNode) => {
  if (isElement(domNode) && !domNode.parent && domNode.name === 'p') {
    // The root element from the `marked.parse` will in many cases result in a `p` tag, which is not what we want,
    // since the text might already be used in f.ex `p`, `button`, `label` tags etc.
    // Span is a better solution, although not perfect, as block level elements are not valid children (f.ex h1), but this should be less frequent.
    domNode.name = 'span';
  }
};

export function getOrgName(
  orgs: IAltinnOrgs | null,
  org: string | undefined,
  langTools: IUseLanguage,
): string | undefined {
  if (orgs && typeof org === 'string' && orgs[org]) {
    return orgs[org].name[langTools.selectedLanguage] || orgs[org].name.nb;
  }

  return undefined;
}

const appOwnerKey = 'appOwner';

export function getAppOwner(orgs: IAltinnOrgs | null, org: string | undefined, langTools: IUseLanguage) {
  const appOwner = langTools.langAsString(appOwnerKey);
  if (appOwner !== appOwnerKey) {
    return appOwner;
  }

  return getOrgName(orgs, org, langTools);
}

const appReceiverKey = 'appReceiver';

export function getAppReceiver(
  orgs: IAltinnOrgs | null,
  org: string | undefined,
  langTools: IUseLanguage,
): string | undefined {
  const appReceiver = langTools.langAsString(appReceiverKey);
  if (appReceiver !== appReceiverKey) {
    return appReceiver;
  }

  return getOrgName(orgs, org, langTools);
}

const appNameKey = 'appName';
const oldAppNameKey = 'ServiceName';

export function getAppName(applicationMetadata: IApplication | null, langTools: IUseLanguage) {
  let appName = langTools.langAsString(appNameKey);
  if (appName === appNameKey) {
    appName = langTools.langAsString(oldAppNameKey);
  }

  if (appName !== appNameKey && appName !== oldAppNameKey) {
    return appName;
  }

  // if no text resource key is set, fetch from app metadata
  if (applicationMetadata) {
    return applicationMetadata.title[langTools.selectedLanguage] || applicationMetadata.title.nb;
  }

  return undefined;
}

function getOrgLogo(orgs: IAltinnOrgs | null, org: string | undefined) {
  if (orgs && typeof org === 'string' && orgs[org]) {
    return orgs[org].logo;
  }

  return undefined;
}

const appLogoKey = 'appLogo.url';

export function getAppLogoUrl(
  orgs: IAltinnOrgs | null,
  org: string | undefined,
  langTools: IUseLanguage,
  useOrgAsSource: boolean,
) {
  if (useOrgAsSource) {
    return getOrgLogo(orgs, org);
  }

  const appLogo = langTools.langAsString(appLogoKey);
  if (appLogo !== appLogoKey) {
    return appLogo;
  }

  return getOrgLogo(orgs, org);
}

const appLogoAltTextKey = 'appLogo.altText';

export function getAppLogoAltText(orgs: IAltinnOrgs | null, org: string | undefined, langTools: IUseLanguage) {
  const altText = langTools.langAsString(appLogoAltTextKey);
  if (altText !== appLogoAltTextKey) {
    return altText;
  }

  return getOrgName(orgs, org, langTools);
}

export function getdisplayAppOwnerNameInHeader(applicationMetadata: IApplicationMetadata | null) {
  return applicationMetadata?.logo?.displayAppOwnerNameInHeader ?? false;
}

export function getUseAppLogoOrgSource(applicationMetadata: IApplicationMetadata) {
  return (applicationMetadata.logo?.source ?? 'org') === 'org';
}
