import ISO6391 from 'iso-639-1';
import type { Option } from './types';

const intlNb = new Intl.DisplayNames(['nb'], { type: 'language' });

type GetLangName = {
  code: string;
  intlDisplayNames?: Intl.DisplayNames;
};

export const getLangName = ({ code, intlDisplayNames = intlNb }: GetLangName) => {
  if (!code) {
    return '';
  }

  const langName = intlDisplayNames.of(code);
  if (langName !== code) {
    return langName;
  }

  const langNameInEnglish = ISO6391.getName(code);
  if (langNameInEnglish !== '') {
    // Change case to lowercase, to "match" the names returned from Intl.DisplayNames
    // This needs to change if we start supporting DisplayNames in other langs
    return langNameInEnglish.toLowerCase();
  }

  return code;
};

type GetRandNumber = {
  min?: number;
  max?: number;
};

export const getRandNumber = ({ min = 1000, max = 9999 }: GetRandNumber = {}) =>
  Math.floor(Math.random() * (max - min + 1) + min);

export const langOptions: Option[] = ISO6391.getAllCodes()
  .map((code: string) => ({
    value: code,
    label: getLangName({ code }),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
