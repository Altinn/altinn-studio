import { createContext, type PropsWithChildren, type ReactNode, useContext } from 'react';

import type { LooseAutocomplete, ValidLanguageKey } from '@app/language';

type LanguageKey = LooseAutocomplete<ValidLanguageKey>;
type LangParams = (string | number | undefined)[];
type LangFn = (key: LanguageKey | undefined, params?: LangParams) => ReactNode;
type LangAsStringFn = (key: LanguageKey | undefined, params?: LangParams) => string;

export type LanguageTranslatorContextProps = {
  lang: LangFn;
  langAsString: LangAsStringFn;
  /**
   * Like {@link langAsString}, but returns the raw text without parsing HTML/markdown. Use this when
   * the text resource is a literal marker (e.g. the required `*`) that markdown processing would strip.
   */
  langAsNonProcessedString: LangAsStringFn;
  /**
   * Shows the label of a radio button or checkbox option. Without it the label is
   * {@link langAsString}, as in the app; an editor passes it to make the label editable in place.
   */
  optionLabel?: LangFn;
  /**
   * The currently active language code (e.g. `nb`, `nn`, `en`)
   */
  currentLanguage: string;
};

const contextNoTranslate: LanguageTranslatorContextProps = {
  lang: (key) => key ?? null,
  langAsString: (key) => key ?? '',
  langAsNonProcessedString: (key) => key ?? '',
  currentLanguage: 'nb',
};

const LanguageTranslatorContext = createContext<LanguageTranslatorContextProps>(contextNoTranslate);

export function LanguageTranslatorProvider({
  lang,
  langAsString,
  langAsNonProcessedString,
  optionLabel,
  currentLanguage,
  children,
}: PropsWithChildren<LanguageTranslatorContextProps>) {
  return (
    <LanguageTranslatorContext.Provider
      value={{ lang, langAsString, langAsNonProcessedString, optionLabel, currentLanguage }}
    >
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
