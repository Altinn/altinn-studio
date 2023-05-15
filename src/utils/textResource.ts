import { getParsedLanguageFromKey, getParsedLanguageFromText, getTextResourceByKey } from 'src/language/sharedLanguage';
import type { ValidLanguageKey } from 'src/hooks/useLanguage';
import type { ITextResource } from 'src/types';
import type { ILanguage } from 'src/types/shared';

/**
 * @deprecated Use lang() or langAsString() from useLanguage.ts instead
 * @see useLanguage
 */
export function getTextFromAppOrDefault(
  key: string | ValidLanguageKey,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
  stringOutput?: false,
): JSX.Element | JSX.Element[];
export function getTextFromAppOrDefault(
  key: string | ValidLanguageKey,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
  stringOutput?: true,
): string;
export function getTextFromAppOrDefault(
  key: string | ValidLanguageKey,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
  stringOutput?: boolean,
): any {
  const textResource: string | undefined = getTextResourceByKey(key, textResources);
  if (textResource !== key && textResource !== undefined) {
    if (stringOutput) {
      return textResource;
    }
    return getParsedLanguageFromText(textResource);
  }

  return stringOutput
    ? getParsedLanguageFromKey(key as ValidLanguageKey, language, params, true)
    : getParsedLanguageFromKey(key as ValidLanguageKey, language, params, false);
}
