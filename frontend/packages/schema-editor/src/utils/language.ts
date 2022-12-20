import type { ILanguage } from '../types';
import { getLanguageFromKey } from 'app-shared/utils/language';

export const getTranslation = (key: string, language: ILanguage) => {
  if (!key) {
    return key;
  }
  const compoundKey = `schema_editor.${key}`;
  const value = getLanguageFromKey(compoundKey, language);
  return value !== compoundKey ? value : key;
};
