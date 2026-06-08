import { createContext, type JSX, type PropsWithChildren, type ReactNode, useContext } from 'react';

import type { ValidLanguageKey } from '@app/language';

type LangFn = (key: ValidLanguageKey | undefined, params?: TranslationParams) => ReactNode;
type TranslationParams = (string | number | undefined)[];
type TranslateFn = (key: ValidLanguageKey, params?: TranslationParams) => string;
type TranslateComponent = (args: {
  tKey: ValidLanguageKey;
  params?: TranslationParams;
}) => string | JSX.Element | JSX.Element[] | null;

type LanguageTranslatorContextProps = {
  lang: LangFn;
  translate: TranslateFn;
  TranslateComponent: TranslateComponent;
};

const contextNoTranslate: LanguageTranslatorContextProps = {
  lang: (key) => key ?? null,
  translate: (key) => key,
  TranslateComponent: ({ tKey }) => tKey,
};

const LanguageTranslatorContext = createContext<LanguageTranslatorContextProps>(contextNoTranslate);

export function LanguageTranslatorProvider({
  lang,
  translate,
  TranslateComponent,
  children,
}: PropsWithChildren<LanguageTranslatorContextProps>) {
  return (
    <LanguageTranslatorContext.Provider value={{ lang, translate, TranslateComponent }}>
      {children}
    </LanguageTranslatorContext.Provider>
  );
}

export function useTranslation(): LanguageTranslatorContextProps {
  return useContext(LanguageTranslatorContext);
}
