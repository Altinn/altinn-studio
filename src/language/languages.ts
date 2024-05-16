import { en } from 'src/language/texts/en';
import { nb } from 'src/language/texts/nb';
import { nn } from 'src/language/texts/nn';

export type FixedLanguageList = ReturnType<typeof en>;
export interface NestedTexts {
  [n: string]: string | NestedTexts;
}

// This makes sure we don't generate a new object
// each time (which would fail shallow comparisons, in for example React.memo)
const cachedLanguages: Record<string, FixedLanguageList> = {};
const langFuncMap = { en, nb, nn };

export function getLanguageFromCode(languageCode: string) {
  const isValid = Object.prototype.hasOwnProperty.call(langFuncMap, languageCode);
  if (!isValid) {
    return en();
  }

  const validCode = languageCode as keyof typeof langFuncMap;
  if (cachedLanguages[validCode]) {
    return cachedLanguages[validCode];
  }

  const langFunc = langFuncMap[validCode];
  if (langFunc) {
    const language = langFunc();
    cachedLanguages[validCode] = language;
    return language;
  }

  return en();
}

export const rightToLeftISOLanguageCodes = [
  'ar', // Arabic
  'arc', // Aramaic
  'dv', // Divehi
  'fa', // Persian
  'ha', // Hausa
  'he', // Hebrew
  'khw', // Khowar
  'ks', // Kashmiri
  'ku', // Kurdish
  'ps', // Pashto
  'ur', // Urdu
  'yi', // Yiddish
];
