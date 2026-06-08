import { en } from './texts/en';
import { nb } from './texts/nb';
import { nn } from './texts/nn';

export type FixedLanguageList = ReturnType<typeof en>;

/**
 * All valid language keys, derived from the English texts which act as the source of truth.
 * Use this to type-check that a translation key actually exists.
 */
export type ValidLanguageKey = keyof FixedLanguageList;

// This makes sure we don't generate a new object
// each time (which would fail shallow comparisons, in for example React.memo)
const cachedLanguages: Record<string, FixedLanguageList> = {};

export function getLanguageFromCode(languageCode: string) {
  if (cachedLanguages[languageCode]) {
    return cachedLanguages[languageCode];
  }

  if (languageCode === 'nb') {
    cachedLanguages[languageCode] = nb() satisfies FixedLanguageList;
    return cachedLanguages[languageCode];
  }

  if (languageCode === 'nn') {
    cachedLanguages[languageCode] = nn() satisfies FixedLanguageList;
    return cachedLanguages[languageCode];
  }

  if (cachedLanguages['en']) {
    return cachedLanguages['en'];
  }

  cachedLanguages['en'] = en();
  return cachedLanguages['en'];
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
