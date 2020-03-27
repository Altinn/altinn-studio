import { ITextResource } from 'src/types/global';
import { getParsedLanguageFromKey, getParsedLanguageFromText } from 'altinn-shared/utils';

export function getTextResourceByKey(key: string, textResources: ITextResource[]) {
  if (!textResources) {
    return key;
  }
  const textResource = textResources.find((resource: ITextResource) => resource.id === key);
  return textResource ? textResource.value : key;
}

export const getTextFromAppOrDefault = (key: string, textResources: ITextResource[], language: any, params?: string[]) => {
  const textResource: string = getTextResourceByKey(key, textResources);
  if (textResource !== key) {
    return getParsedLanguageFromText(textResource);
  }

  return getParsedLanguageFromKey(key, language, params);
}
