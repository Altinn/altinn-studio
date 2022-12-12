import ISO6391 from 'iso-639-1';
import type { Option } from './types';

const intlNb = new Intl.DisplayNames(['nb'], { type: 'language' });

type GetLanguageName = {
  code: string;
  intlDisplayNames?: Intl.DisplayNames;
};

export const getLanguageName = ({ code, intlDisplayNames = intlNb }: GetLanguageName) => {
  if (!code) {
    return '';
  }

  const languageName = intlDisplayNames.of(code);
  if (languageName !== code) {
    return languageName;
  }

  const languageNameInEnglish = ISO6391.getName(code);
  if (languageNameInEnglish !== '') {
    // Change case to lowercase, to "match" the names returned from Intl.DisplayNames
    // This needs to change if we start supporting DisplayNames in other languages
    return languageNameInEnglish.toLowerCase();
  }

  return code;
};

type GetRandNumber = {
  min?: number;
  max?: number;
};

export const getRandNumber = ({ min = 1000, max = 9999 }: GetRandNumber = {}) =>
  Math.floor(Math.random() * (max - min + 1) + min);

export const languageOptions: Option[] = ISO6391.getAllCodes()
  .map((code: string) => {
    return { value: code, label: getLanguageName({ code }) };
  })
  .sort((a, b) => a.label.localeCompare(b.label));
