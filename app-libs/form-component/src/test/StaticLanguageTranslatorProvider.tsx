import type { PropsWithChildren } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component/LanguageTranslatorProvider';
import { parseAndCleanText } from '@app/form-component/text/parseAndCleanText';
import {
  getLanguageFromCode,
  type LooseAutocomplete,
  replaceParameters,
  type SimpleLangParam,
  type ValidLanguageKey,
} from '@app/language';

export type StaticLanguageCode = 'en' | 'nb' | 'nn';

type StaticLanguageTranslatorProviderProps = PropsWithChildren<{
  /** Language used to resolve translations. Defaults to 'en'. */
  language?: StaticLanguageCode;
}>;

/**
 * Wraps children in a {@link LanguageTranslatorProvider} backed by the real translations from the
 * `@app/language` package. Use it in unit tests and Storybook so components that rely on
 * `useTranslation()` render translated text outside the app.
 */
export function StaticLanguageTranslatorProvider({
  language = 'en',
  children,
}: StaticLanguageTranslatorProviderProps) {
  const texts = getLanguageFromCode(language);

  const translateKey = (
    key: LooseAutocomplete<ValidLanguageKey> | undefined,
    params?: SimpleLangParam[],
  ): string => {
    if (key === undefined) {
      return '';
    }
    const text = texts[key as ValidLanguageKey] ?? key;
    if (!params?.length) {
      return text;
    }
    return replaceParameters(text, params);
  };

  return (
    <LanguageTranslatorProvider
      lang={(key, params) => parseAndCleanText(translateKey(key, params))}
      langAsString={translateKey}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
