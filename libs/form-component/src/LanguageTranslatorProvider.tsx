import { createContext, type PropsWithChildren, type ReactNode, useContext } from 'react';

import type { LooseAutocomplete, ValidLanguageKey } from '@app/language';

type LanguageKey = LooseAutocomplete<ValidLanguageKey>;
type LangParams = (string | number | undefined)[];
type LangFn = (key: LanguageKey | undefined, params?: LangParams) => ReactNode;
type LangAsStringFn = (key: LanguageKey | undefined, params?: LangParams) => string;

type LanguageTranslatorContextProps = {
  lang: LangFn;
  langAsString: LangAsStringFn;
};

const contextNoTranslate: LanguageTranslatorContextProps = {
  lang: (key) => key ?? null,
  langAsString: (key) => key ?? '',
};

const LanguageTranslatorContext = createContext<LanguageTranslatorContextProps>(contextNoTranslate);

export function LanguageTranslatorProvider({
  lang,
  langAsString,
  children,
}: PropsWithChildren<LanguageTranslatorContextProps>) {
  return (
    <LanguageTranslatorContext.Provider value={{ lang, langAsString }}>
      {children}
    </LanguageTranslatorContext.Provider>
  );
}

export function useTranslation(): LanguageTranslatorContextProps {
  return useContext(LanguageTranslatorContext);
}
