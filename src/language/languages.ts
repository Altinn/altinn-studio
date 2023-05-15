import { en } from 'src/language/texts/en';
import { nb } from 'src/language/texts/nb';
import { nn } from 'src/language/texts/nn';

export type FixedLanguageList = ReturnType<typeof en>;

export function getLanguageFromCode(languageCode: string) {
  switch (languageCode) {
    case 'en':
      return en();
    case 'nb':
      return nb();
    case 'nn':
      return nn();
    default:
      return nb();
  }
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
