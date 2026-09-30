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
  /**
   * Custom text-resource overrides, keyed by text-resource binding. These take precedence over the
   * real translations, so a test/story can resolve app-specific keys that aren't in `@app/language`
   * (e.g. `{ 'my.title': 'My Title' }`) while still getting the built-in translations for free.
   */
  overrides?: Record<string, string>;
}>;

/**
 * Wraps children in a {@link LanguageTranslatorProvider} backed by the real translations from the
 * `@app/language` package. Use it in unit tests and Storybook so components that rely on
 * `useTranslation()` render translated text outside the app. Pass `overrides` to resolve custom
 * text-resource keys without restating the built-in translations.
 */
export function StaticLanguageTranslatorProvider({
  language = 'en',
  overrides,
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
    const text = overrides?.[key] ?? texts[key as ValidLanguageKey] ?? key;
    if (!params?.length) {
      return text;
    }
    return replaceParameters(text, params);
  };

  return (
    <LanguageTranslatorProvider
      lang={(key, params) => parseAndCleanText(translateKey(key, params))}
      langAsString={translateKey}
      langAsNonProcessedString={translateKey}
      currentLanguage={language}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
