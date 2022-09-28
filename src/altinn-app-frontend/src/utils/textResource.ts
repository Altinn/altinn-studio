import type { ITextResource } from 'src/types';

import {
  getParsedLanguageFromKey,
  getParsedLanguageFromText,
  getTextResourceByKey,
} from 'altinn-shared/utils';
import type { ILanguage } from 'altinn-shared/types';

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
