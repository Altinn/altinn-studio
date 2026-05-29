import { createContext, type JSX, type PropsWithChildren, useContext } from 'react';

type TranslationParams = (string | number | undefined)[];
type TranslateFn = (key: string, params?: TranslationParams) => string;
type TranslateComponent = (args: {
  tKey: string;
  params?: TranslationParams;
}) => string | JSX.Element | JSX.Element[] | null;

type LanguageTranslatorContextProps = {
  translate: TranslateFn;
  TranslateComponent: TranslateComponent;
};

const contextNoTranslate: LanguageTranslatorContextProps = {
  translate: (key) => key,
  TranslateComponent: ({ tKey }) => tKey,
};

const LanguageTranslatorContext = createContext<LanguageTranslatorContextProps>(contextNoTranslate);

export function LanguageTranslatorProvider({
  translate,
  TranslateComponent,
  children,
}: PropsWithChildren<LanguageTranslatorContextProps>) {
  return (
    <LanguageTranslatorContext.Provider value={{ translate, TranslateComponent }}>
      {children}
    </LanguageTranslatorContext.Provider>
  );
}

export function useTranslation(): LanguageTranslatorContextProps {
  const context = useContext(LanguageTranslatorContext);
  return context;
}
