import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';

import { useLanguage } from 'src/features/language/useLanguage';
import type { ValidLangParam, ValidLanguageKey } from 'src/features/language/useLanguage';

export interface LangProps {
  id: ValidLanguageKey | string | undefined;
  params?: ValidLangParam[];
  customTextParameters?: Record<string, string>;
  parseHtmlAndMarkdown?: boolean;
}

export function Lang({ id, params, customTextParameters, parseHtmlAndMarkdown }: LangProps) {
  const { lang, langAsNonProcessedString } = useLanguage();

  if (parseHtmlAndMarkdown === false) {
    return langAsNonProcessedString(id, params, customTextParameters);
  }

  return lang(id, params, customTextParameters);
}

/**
 * This will wrap the text in a Paragraph component, but only if the resulting text is a pure string or inline content (span)
 * If lang() returns block elements like headings, lists etc. it is wrapped in a div with Paragraph styling to not cause invalid element nesting
 */
export function LangAsParagraph({ id, params, customTextParameters, parseHtmlAndMarkdown }: LangProps) {
  const { lang, langAsNonProcessedString } = useLanguage();

  if (parseHtmlAndMarkdown === false) {
    return <Paragraph>{langAsNonProcessedString(id, params, customTextParameters)}</Paragraph>;
  }

  const text = lang(id, params, customTextParameters);
  // The lang() function returns an object with a type property set to 'span' if text contains inline-element(s) or just a string.
  // @see sharedLanguage.ts > parserOptions
  const textIsInline = text && typeof text === 'object' && 'type' in text && text.type === 'span';
  return <Paragraph asChild={!textIsInline}>{!textIsInline ? <div>{text}</div> : text}</Paragraph>;
}
