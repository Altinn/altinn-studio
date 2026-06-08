import type { PropsWithChildren } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component/LanguageTranslatorProvider';
import {
  getLanguageFromCode,
  type LooseAutocomplete,
  replaceParameters,
  type SimpleLangParam,
  type ValidLanguageKey,
} from '@app/language';

/** The languages with static translations available outside the app (test and Storybook). */
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
      lang={translateKey}
      translate={translateKey}
      TranslateComponent={({ tKey, params }) => translateKey(tKey, params)}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
