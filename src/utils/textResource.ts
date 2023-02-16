import { getParsedLanguageFromKey, getParsedLanguageFromText, getTextResourceByKey } from 'src/language/sharedLanguage';
import type { ITextResource } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export function getTextFromAppOrDefault(
  key: string,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
  stringOutput?: false,
): JSX.Element | JSX.Element[];
export function getTextFromAppOrDefault(
  key: string,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
  stringOutput?: true,
): string;
export function getTextFromAppOrDefault(
  key: string,
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
    ? getParsedLanguageFromKey(key, language, params, true)
    : getParsedLanguageFromKey(key, language, params, false);
}
