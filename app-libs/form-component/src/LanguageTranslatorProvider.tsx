import { createContext, type PropsWithChildren, type ReactNode, useContext } from 'react';

import type { LooseAutocomplete, ValidLanguageKey } from '@app/language';

type LanguageKey = LooseAutocomplete<ValidLanguageKey>;
type LangParams = (string | number | undefined)[];
type LangFn = (key: LanguageKey | undefined, params?: LangParams) => ReactNode;
type LangAsStringFn = (key: LanguageKey | undefined, params?: LangParams) => string;

type LanguageTranslatorContextProps = {
  lang: LangFn;
  langAsString: LangAsStringFn;
  /**
   * The currently active language code (e.g. `nb`, `nn`, `en`)
   */
  currentLanguage: string;
};

const contextNoTranslate: LanguageTranslatorContextProps = {
  lang: (key) => key ?? null,
  langAsString: (key) => key ?? '',
  currentLanguage: 'nb',
};

const LanguageTranslatorContext = createContext<LanguageTranslatorContextProps>(contextNoTranslate);

export function LanguageTranslatorProvider({
  lang,
  langAsString,
  currentLanguage,
  children,
}: PropsWithChildren<LanguageTranslatorContextProps>) {
  return (
    <LanguageTranslatorContext.Provider value={{ lang, langAsString, currentLanguage }}>
      {children}
    </LanguageTranslatorContext.Provider>
  );
}

export function useTranslation(): LanguageTranslatorContextProps {
  return useContext(LanguageTranslatorContext);
}

export function useCurrentLanguage(): string {
  return useContext(LanguageTranslatorContext).currentLanguage;
}
