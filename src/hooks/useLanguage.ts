import { useAppSelector } from 'src/hooks/useAppSelector';
import { getParsedLanguageFromKey, getParsedLanguageFromText, getTextResourceByKey } from 'src/language/sharedLanguage';
import type { FixedLanguageList } from 'src/language/languages';

export interface IUseLanguage {
  lang(key: ValidLanguageKey | string | undefined, params?: string[]): string | JSX.Element | JSX.Element[] | null;
  langAsString(key: ValidLanguageKey | string | undefined, params?: string[]): string;
}

/**
 * This type converts the language object into a dot notation union of valid language keys.
 * Using this type helps us get suggestions for valid language keys in useLanguage() functions.
 * Thanks to ChatGPT for refinements to make this work!
 */
type ObjectToDotNotation<T extends Record<string, any>, Prefix extends string = ''> = {
  [K in keyof T]: K extends string
    ? T[K] extends string | number | boolean | null | undefined
      ? `${Prefix}${K}`
      : K extends string
      ? ObjectToDotNotation<T[K], `${Prefix}${K}.`>
      : never
    : never;
}[keyof T];

export type ValidLanguageKey = ObjectToDotNotation<FixedLanguageList>;

/**
 * Hook to resolve a key to a language string or React element (if the key is found and contains markdown or HTML).
 * Prefer this over using the long-named language functions. When those are less used, we can refactor their
 * functionality into this hook and remove them.
 *
 * You get two functions from this hook, and you can choose which one to use based on your needs:
 * - lang(key, params) usually returns a React element
 */
export function useLanguage(): IUseLanguage {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  return {
    lang: (key, params) => {
      const textResource: string | undefined = getTextResourceByKey(key, textResources);
      if (textResource !== key && textResource !== undefined) {
        return getParsedLanguageFromText(textResource);
      }

      return getParsedLanguageFromKey(key as ValidLanguageKey, language, params, false);
    },
    langAsString: (key, params) => {
      const textResource = getTextResourceByKey(key, textResources);
      if (textResource !== key && textResource !== undefined) {
        return textResource;
      }

      return getParsedLanguageFromKey(key as ValidLanguageKey, language, params, true);
    },
  };
}
