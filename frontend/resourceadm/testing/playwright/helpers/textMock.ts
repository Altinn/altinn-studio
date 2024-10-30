import * as nbTexts from '@altinn-studio/language/src/nb.json';
import * as enTexts from '@altinn-studio/language/src/en.json';
import * as nbResourceTexts from '../../../language/src/nb.json';
import * as enResourceTexts from '../../../language/src/en.json';

type Locale = 'nb' | 'en';
export type TextKey =
  | keyof typeof nbTexts
  | keyof typeof enTexts
  | keyof typeof nbResourceTexts
  | keyof typeof enResourceTexts;

const localeTextMap: Record<Locale, typeof nbTexts | typeof enTexts> = {
  nb: { ...nbTexts, ...nbResourceTexts },
  en: { ...enTexts, ...enResourceTexts },
};

type TextMockParams = Record<string, string>;

export const textMock = (key: TextKey, params?: TextMockParams, locale: Locale = 'nb'): string => {
  let text = localeTextMap[locale][key] || key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      const paramValue = params[paramKey];
      text = text.replace(`{{${paramKey}}}`, paramValue);
    });
  }

  return text;
};
