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
