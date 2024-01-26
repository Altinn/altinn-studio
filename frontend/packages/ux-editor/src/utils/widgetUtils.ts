import type { IWidgetTexts } from '../types/global';
import type { ITextResource } from 'app-shared/types/global';

/**
 * Extracts all languages from a list of widget texts.
 * @param texts The widget texts to extract languages from.
 * @returns An array of the languages present in the array.
 */
export const extractLanguagesFromWidgetTexts = (texts: IWidgetTexts[]): string[] => {
  const languages: string[] = [];
  texts.forEach((text) => {
    if (!languages.includes(text.language)) {
      languages.push(text.language);
    }
  });
  return languages;
};

/**
 * Extracts all text resources from a list of widget texts by language.
 * @param texts The widget texts to extract text resources from.
 * @param language The language to filter text resources by.
 * @returns An array of the text resources with the given language.
 */
export const extractTextsFromWidgetTextsByLanguage = (
  texts: IWidgetTexts[],
  language: string,
): ITextResource[] =>
  texts
    .filter((text) => text.language === language)
    .map((text) => text.resources)
    .flat();
