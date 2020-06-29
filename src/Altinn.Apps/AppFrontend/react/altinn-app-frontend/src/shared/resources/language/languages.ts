import { nb } from './texts/nb';
import { en } from './texts/en';
// import { nn } from './texts/nn';

export interface ILanguages {
  [id: string]: () => any;
}

// Temporary fix, until mapping to language codes from SBL has been done.
const languages: ILanguages = {
  1033: en,
  1044: nb,
  // 2068: nn,
};
const defaultLanguage = '1044';

export function getLanguageFromCode(languageCode: string): () => any {
  if (Object.keys(languages).find((key) => key === languageCode)) {
    return languages[languageCode]();
  }

  return languages[defaultLanguage]();
}
