import { nb } from './texts/nb';
import { en } from './texts/en';
import { nn } from './texts/nn';

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
