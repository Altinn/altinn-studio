import { ITextResource } from 'src/types';
import { getParsedLanguageFromKey, getParsedLanguageFromText } from 'altinn-shared/utils';
import { ILanguage } from 'altinn-shared/types';

export function getTextResourceByKey(key: string, textResources: ITextResource[]) {
  if (!textResources) {
    return key;
  }
  const textResource = textResources.find((resource: ITextResource) => resource.id === key);
  return textResource ? textResource.value : key;
}

export function getParsedTextResourceByKey(key: string, textResources: ITextResource[]) {
  if (!textResources) {
    return key;
  }
  const textResource = textResources.find((resource: ITextResource) => resource.id === key);
  return getParsedLanguageFromText(textResource?.value || key);
}

export const getTextFromAppOrDefault = (
  key: string,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
  stringOutput?: boolean,
) => {
  const textResource: string = getTextResourceByKey(key, textResources);
  if (textResource !== key) {
    if (stringOutput) {
      return textResource;
    }
    return getParsedLanguageFromText(textResource);
  }

  return getParsedLanguageFromKey(key, language, params, stringOutput);
};
